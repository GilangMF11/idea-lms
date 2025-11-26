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
        ...(user.role === 'STUDENT' ? { userId: user.id } : {}),
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

    const { exerciseId, answer } = await request.json();

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
