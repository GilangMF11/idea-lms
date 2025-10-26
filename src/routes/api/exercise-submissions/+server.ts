import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { verifyToken } from '$lib/auth.js';
import { createHistory } from '$lib/history.js';

export const GET: RequestHandler = async ({ request, url }: { request: any; url: any }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (!user) {
      return json({ error: 'Invalid token' }, { status: 401 });
    }

    const exerciseId = url.searchParams.get('exerciseId');
    const userId = url.searchParams.get('userId');
    
    if (!exerciseId) {
      return json({ error: 'Exercise ID is required' }, { status: 400 });
    }

    // Check if user has access to this exercise
    const exercise = await prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        class: {
          OR: [
            { teacherId: user.id },
            { students: { some: { studentId: user.id } } },
          ],
        },
      },
    });

    if (!exercise) {
      return json({ error: 'Exercise not found or access denied' }, { status: 404 });
    }

    const submissions = await prisma.exerciseSubmission.findMany({
      where: {
        exerciseId,
        ...(userId ? { userId } : (user.role === 'STUDENT' ? { userId: user.id } : {})),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    // If userId is provided, return single submission for that user
    if (userId) {
      const submission = submissions.find(s => s.userId === userId);
      return json({ submission });
    }

    return json({ submissions });
  } catch (error) {
    console.error('Get exercise submissions error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (!user) {
      return json({ error: 'Invalid token' }, { status: 401 });
    }

    // Handle both JSON and FormData
    const contentType = request.headers.get('content-type') || '';
    let exerciseId, answer, files: File[] = [];

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData();
      exerciseId = formData.get('exerciseId');
      answer = formData.get('answer');
      
      // Extract files
      const fileEntries = Array.from(formData.entries())
        .filter(([key]) => key.startsWith('file_'))
        .map(([, file]) => file as File);
      files = fileEntries;
    } else {
      // Handle JSON (existing functionality)
      const body = await request.json();
      exerciseId = body.exerciseId;
      answer = body.answer;
    }

    if (!exerciseId || !answer) {
      return json({ error: 'Exercise ID and answer are required' }, { status: 400 });
    }

    // Check if user has access to this exercise
    const exercise = await prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        class: {
          OR: [
            { teacherId: user.id },
            { students: { some: { studentId: user.id } } },
          ],
        },
      },
    });

    if (!exercise) {
      return json({ error: 'Exercise not found or access denied' }, { status: 404 });
    }

    // Check if submission already exists
    const existingSubmission = await prisma.exerciseSubmission.findFirst({
      where: {
        exerciseId,
        userId: user.id,
      },
    });

    if (existingSubmission) {
      return json({ error: 'Submission already exists for this exercise' }, { status: 409 });
    }

    const submission = await prisma.exerciseSubmission.create({
      data: {
        exerciseId,
        userId: user.id,
        answer,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Handle file uploads if any
    let fileUrls = [];
    if (files.length > 0) {
      // Store file content and info
      const fileInfo = [];
      
      for (const file of files) {
        // Read file content
        const fileContent = await file.text();
        
        fileInfo.push({
          name: file.name,
          size: file.size,
          type: file.type,
          content: fileContent,
          uploadedAt: new Date().toISOString()
        });
      }
      
      // Update submission with file info and content
      await prisma.exerciseSubmission.update({
        where: { id: submission.id },
        data: {
          answer: `${answer}\n\n--- Attached Files ---\n${JSON.stringify(fileInfo, null, 2)}`
        }
      });
    }

    // Create history record
    await createHistory({
      tableName: 'exercise_submissions',
      recordId: submission.id,
      action: 'CREATE',
      newData: submission,
      userId: user.id,
      classId: exercise.classId,
    });

    return json({ submission }, { status: 201 });
  } catch (error) {
    console.error('Create exercise submission error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ request, url }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (!user || user.role !== 'TEACHER') {
      return json({ error: 'Only teachers can grade submissions' }, { status: 403 });
    }

    const submissionId = url.searchParams.get('id');
    if (!submissionId) {
      return json({ error: 'Submission ID is required' }, { status: 400 });
    }

    const { score, feedback } = await request.json();

    if (score === undefined) {
      return json({ error: 'Score is required' }, { status: 400 });
    }

    // Check if submission exists and user has access
    const submission = await prisma.exerciseSubmission.findFirst({
      where: {
        id: submissionId,
        exercise: {
          class: {
            teacherId: user.id,
          },
        },
      },
      include: {
        exercise: {
          select: {
            classId: true,
          },
        },
      },
    });

    if (!submission) {
      return json({ error: 'Submission not found or access denied' }, { status: 404 });
    }

    const updatedSubmission = await prisma.exerciseSubmission.update({
      where: { id: submissionId },
      data: {
        score: parseInt(score),
        feedback: feedback || null,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        exercise: {
          select: {
            id: true,
            title: true,
            classId: true,
          },
        },
      },
    });

    // Create history entry
    await createHistory({
      action: 'UPDATE',
      tableName: 'exercise_submissions',
      recordId: submissionId,
      oldData: submission,
      newData: updatedSubmission,
      userId: user.id,
      classId: submission.exercise.classId,
    });

    return json({ submission: updatedSubmission });
  } catch (error) {
    console.error('Update exercise submission error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const PATCH: RequestHandler = async ({ request, url }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (!user || user.role !== 'TEACHER') {
      return json({ error: 'Only teachers can grade submissions' }, { status: 403 });
    }

    const submissionId = url.searchParams.get('id');
    if (!submissionId) {
      return json({ error: 'Submission ID is required' }, { status: 400 });
    }

    const { score, feedback } = await request.json();

    if (score === undefined) {
      return json({ error: 'Score is required' }, { status: 400 });
    }

    // Check if submission exists and user has access
    const submission = await prisma.exerciseSubmission.findFirst({
      where: {
        id: submissionId,
        exercise: {
          class: {
            teacherId: user.id,
          },
        },
      },
      include: {
        exercise: {
          select: {
            classId: true,
          },
        },
      },
    });

    if (!submission) {
      return json({ error: 'Submission not found or access denied' }, { status: 404 });
    }

    const updatedSubmission = await prisma.exerciseSubmission.update({
      where: { id: submissionId },
      data: {
        score,
        feedback: feedback || null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Create history record
    await createHistory({
      tableName: 'exercise_submissions',
      recordId: submission.id,
      action: 'UPDATE',
      oldData: submission,
      newData: updatedSubmission,
      userId: user.id,
      classId: submission.exercise.classId,
    });

    return json({ submission: updatedSubmission });
  } catch (error) {
    console.error('Update exercise submission error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
