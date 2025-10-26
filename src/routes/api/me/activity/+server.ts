import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { verifyToken } from '$lib/auth.js';

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

    const limit = parseInt(url.searchParams.get('limit') || '50');
    const type = url.searchParams.get('type') || 'all';

    let activities = [];

    if (type === 'all' || type === 'drafts') {
      const drafts = await prisma.writingDraft.findMany({
        where: { userId: user.id },
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          class: {
            select: {
              name: true,
              code: true,
            },
          },
        },
      });

      activities.push(...drafts.map((draft: any) => ({
        type: 'draft',
        title: draft.title,
        description: `Updated draft in ${draft.class.name}`,
        timestamp: draft.updatedAt,
        classId: draft.classId,
        className: draft.class.name,
      })));
    }

    if (type === 'all' || type === 'annotations') {
      const annotations = await prisma.annotation.findMany({
        where: { userId: user.id },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          class: {
            select: {
              name: true,
              code: true,
            },
          },
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
        description: `Added annotation in ${annotation.class.name}`,
        timestamp: annotation.createdAt,
        classId: annotation.classId,
        className: annotation.class.name,
      })));
    }

    if (type === 'all' || type === 'peerReviews') {
      const peerReviews = await prisma.peerReview.findMany({
        where: { reviewerId: user.id },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          class: {
            select: {
              name: true,
              code: true,
            },
          },
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
        description: `Reviewed draft in ${review.class.name}`,
        timestamp: review.createdAt,
        classId: review.classId,
        className: review.class.name,
      })));
    }

    if (type === 'all' || type === 'exercises') {
      const exerciseSubmissions = await prisma.exerciseSubmission.findMany({
        where: { userId: user.id },
        take: limit,
        orderBy: { submittedAt: 'desc' },
        include: {
          exercise: {
            select: {
              title: true,
              class: {
                select: {
                  name: true,
                  code: true,
                },
              },
            },
          },
        },
      });

      activities.push(...exerciseSubmissions.map((submission: any) => ({
        type: 'exercise',
        title: `Submitted ${submission.exercise.title}`,
        description: `Submitted exercise in ${submission.exercise.class.name}`,
        timestamp: submission.submittedAt,
        classId: submission.exercise.class.id,
        className: submission.exercise.class.name,
      })));
    }

    if (type === 'all' || type === 'chat') {
      const chatMessages = await prisma.chatMessage.findMany({
        where: { userId: user.id },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          class: {
            select: {
              name: true,
              code: true,
            },
          },
        },
      });

      activities.push(...chatMessages.map((message: any) => ({
        type: 'chat',
        title: `Message in ${message.class.name}`,
        description: message.content.substring(0, 100) + '...',
        timestamp: message.createdAt,
        classId: message.classId,
        className: message.class.name,
      })));
    }

    // Sort by timestamp and return top results
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    activities = activities.slice(0, limit);

    return json({ activities });
  } catch (error) {
    console.error('Get user activity error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
