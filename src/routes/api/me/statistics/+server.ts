import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { verifyToken } from '$lib/auth.js';

export const GET: RequestHandler = async ({ request }: { request: any }) => {
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

    const [
      totalClasses,
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
      prisma.classStudent.count({
        where: { studentId: user.id },
      }),
      prisma.writingDraft.count({
        where: { userId: user.id, isActive: true },
      }),
      prisma.annotation.count({
        where: { userId: user.id, isPublic: true },
      }),
      prisma.peerReview.count({
        where: { reviewerId: user.id },
      }),
      prisma.revision.count({
        where: { userId: user.id },
      }),
      prisma.exerciseSubmission.count({
        where: { userId: user.id },
      }),
      prisma.chatMessage.count({
        where: { userId: user.id },
      }),
      prisma.peerReview.aggregate({
        where: {
          draft: { userId: user.id },
          rating: { not: null },
        },
        _avg: { rating: true },
      }),
      prisma.exerciseSubmission.aggregate({
        where: {
          userId: user.id,
          score: { not: null },
        },
        _avg: { score: true },
      }),
      prisma.history.findMany({
        where: { userId: user.id },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          class: {
            select: {
              name: true,
              code: true,
            },
          },
        },
      }),
    ]);

    const statistics = {
      totalClasses,
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
        className: activity.class?.name || 'Unknown',
      })),
    };

    return json({ statistics });
  } catch (error) {
    console.error('Get user statistics error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
