import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { verifyToken } from '$lib/auth.js';

export const GET: RequestHandler = async ({ request, params }: { request: any; params: any }) => {
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

    const classId = params.classId;

    // Check if user has access to this class
    const classData = await prisma.class.findFirst({
      where: {
        id: classId,
        OR: [
          { teacherId: user.id },
          { students: { some: { studentId: user.id } } },
        ],
      },
      include: {
        teacher: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        students: {
          include: {
            student: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: {
            students: true,
            readingTexts: true,
            exercises: true,
            writingDrafts: true,
            annotations: true,
            chatMessages: true,
          },
        },
      },
    });

    if (!classData) {
      return json({ error: 'Class not found or access denied' }, { status: 404 });
    }

    // Get user's specific data in this class
    const userClassData = {
      isTeacher: classData.teacherId === user.id,
      joinedAt: classData.teacherId === user.id ? classData.createdAt : 
        classData.students.find((s: any) => s.studentId === user.id)?.joinedAt,
      totalDrafts: await prisma.writingDraft.count({
        where: { classId, userId: user.id, isActive: true },
      }),
      totalAnnotations: await prisma.annotation.count({
        where: { classId, userId: user.id, isPublic: true },
      }),
      totalPeerReviews: await prisma.peerReview.count({
        where: { classId, reviewerId: user.id },
      }),
      totalRevisions: await prisma.revision.count({
        where: { classId, userId: user.id },
      }),
      totalExerciseSubmissions: await prisma.exerciseSubmission.count({
        where: {
          userId: user.id,
          exercise: { classId },
        },
      }),
      totalChatMessages: await prisma.chatMessage.count({
        where: { classId, userId: user.id },
      }),
    };

    return json({ 
      class: classData,
      userClassData,
    });
  } catch (error) {
    console.error('Get user class data error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
