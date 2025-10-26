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

    const draftId = url.searchParams.get('draftId');
    const classId = url.searchParams.get('classId');

    if (!draftId || !classId) {
      return json({ error: 'Draft ID and class ID are required' }, { status: 400 });
    }

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

    const reviews = await prisma.peerReview.findMany({
      where: {
        draftId,
        classId,
      },
      include: {
        reviewer: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return json({ reviews });
  } catch (error) {
    console.error('Get peer reviews error:', error);
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

    const { draftId, classId, type, comment, rating, isPositive } = await request.json();

    if (!draftId || !classId || !comment) {
      return json({ error: 'Draft ID, class ID, and comment are required' }, { status: 400 });
    }

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

    // Check if draft exists and belongs to the class
    const draft = await prisma.writingDraft.findFirst({
      where: {
        id: draftId,
        classId,
      },
    });

    if (!draft) {
      return json({ error: 'Draft not found' }, { status: 404 });
    }

    // Don't allow users to review their own drafts
    if (draft.userId === user.id) {
      return json({ error: 'Cannot review your own draft' }, { status: 400 });
    }

    const review = await prisma.peerReview.create({
      data: {
        draftId,
        classId,
        reviewerId: user.id,
        type: type || 'INTERACTIVE',
        comment,
        rating: rating || null,
        isPositive: isPositive ?? true,
      },
      include: {
        reviewer: {
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
      tableName: 'peer_reviews',
      recordId: review.id,
      action: 'CREATE',
      newData: review,
      userId: user.id,
      classId,
    });

    return json({ review }, { status: 201 });
  } catch (error) {
    console.error('Create peer review error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
