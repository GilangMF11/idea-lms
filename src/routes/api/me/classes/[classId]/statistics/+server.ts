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
    const classAccess = await prisma.class.findFirst({
      where: {
        id: classId,
        OR: [
          { teacherId: user.id },
          { students: { some: { studentId: user.id } } },
        ],
      },
    });

    if (!classAccess) {
      return json({ error: 'Access denied to this class' }, { status: 403 });
    }

    const [
      totalDrafts,
      totalAnnotations,
      totalPeerReviews,
      totalRevisions,
      totalExerciseSubmissions,
      totalChatMessages,
      averageDraftScore,
      averageExerciseScore,
      recentActivity,
    ] = await Promise.all([
      prisma.writingDraft.count({
        where: { classId, userId: user.id, isActive: true },
      }),
      prisma.annotation.count({
        where: { classId, userId: user.id, isPublic: true },
      }),
      prisma.peerReview.count({
        where: { classId, reviewerId: user.id },
      }),
      prisma.revision.count({
        where: { classId, userId: user.id },
      }),
      prisma.exerciseSubmission.count({
        where: {
          userId: user.id,
          exercise: { classId },
        },
      }),
      prisma.chatMessage.count({
        where: { classId, userId: user.id },
      }),
      prisma.peerReview.aggregate({
        where: {
          draft: { userId: user.id, classId },
          rating: { not: null },
        },
        _avg: { rating: true },
      }),
      prisma.exerciseSubmission.aggregate({
        where: {
          userId: user.id,
          exercise: { classId },
          score: { not: null },
        },
        _avg: { score: true },
      }),
      prisma.history.findMany({
        where: { userId: user.id, classId },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const statistics = {
      totalDrafts,
      totalAnnotations,
      totalPeerReviews,
      totalRevisions,
      totalExerciseSubmissions,
      totalChatMessages,
      averageDraftScore: averageDraftScore._avg.rating || 0,
      averageExerciseScore: averageExerciseScore._avg.score || 0,
      recentActivity: recentActivity.map((activity: any) => ({
        type: activity.action,
        tableName: activity.tableName,
        description: `${activity.action} ${activity.tableName} record`,
        timestamp: activity.createdAt,
        classId: activity.classId,
      })),
    };

    return json({ statistics });
  } catch (error) {
    console.error('Get class statistics error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};