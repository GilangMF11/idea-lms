import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { verifyToken } from '$lib/auth.js';

export const GET: RequestHandler = async ({ request, params, url }: { request: any; params: any; url: any }) => {
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

    const limit = parseInt(url.searchParams.get('limit') || '50');
    const type = url.searchParams.get('type') || 'all';

    let activities = [];

    if (type === 'all' || type === 'drafts') {
      const drafts = await prisma.writingDraft.findMany({
        where: { classId, userId: user.id },
        take: limit,
        orderBy: { updatedAt: 'desc' },
      });

      activities.push(...drafts.map((draft: any) => ({
        type: 'draft',
        title: draft.title,
        description: 'Updated writing draft',
        timestamp: draft.updatedAt,
        classId: draft.classId,
      })));
    }

    if (type === 'all' || type === 'annotations') {
      const annotations = await prisma.annotation.findMany({
        where: { classId, userId: user.id },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          readingText: {
            select: {
              title: true,
            },
          },
        },
      });

      activities.push(...annotations.map((annotation: any) => ({
        type: 'annotation',
        title: `Annotation on ${annotation.readingText.title}`,
        description: 'Added annotation',
        timestamp: annotation.createdAt,
        classId: annotation.classId,
      })));
    }

    if (type === 'all' || type === 'peerReviews') {
      const peerReviews = await prisma.peerReview.findMany({
        where: { classId, reviewerId: user.id },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          draft: {
            select: {
              title: true,
            },
          },
        },
      });

      activities.push(...peerReviews.map((review: any) => ({
        type: 'peer_review',
        title: `Review for ${review.draft.title}`,
        description: 'Reviewed draft',
        timestamp: review.createdAt,
        classId: review.classId,
      })));
    }

    if (type === 'all' || type === 'exercises') {
      const exerciseSubmissions = await prisma.exerciseSubmission.findMany({
        where: {
          userId: user.id,
          exercise: { classId },
        },
        take: limit,
        orderBy: { submittedAt: 'desc' },
        include: {
          exercise: {
            select: {
              title: true,
            },
          },
        },
      });

      activities.push(...exerciseSubmissions.map((submission: any) => ({
        type: 'exercise',
        title: `Submitted ${submission.exercise.title}`,
        description: 'Submitted exercise',
        timestamp: submission.submittedAt,
        classId: classId,
      })));
    }

    if (type === 'all' || type === 'chat') {
      const chatMessages = await prisma.chatMessage.findMany({
        where: { classId, userId: user.id },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      activities.push(...chatMessages.map((message: any) => ({
        type: 'chat',
        title: 'Chat message',
        description: message.content.substring(0, 100) + '...',
        timestamp: message.createdAt,
        classId: message.classId,
      })));
    }

    // Sort by timestamp and return top results
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    activities = activities.slice(0, limit);

    return json({ activities });
  } catch (error) {
    console.error('Get class activity error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};