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

    const classId = url.searchParams.get('classId');
    if (!classId) {
      return json({ error: 'Class ID is required' }, { status: 400 });
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

    const drafts = await prisma.writingDraft.findMany({
      where: {
        classId,
        isActive: true,
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
        outline: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            peerReviews: true,
            revisions: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return json({ drafts });
  } catch (error) {
    console.error('Get writing drafts error:', error);
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

    const { title, content, classId, outlineId } = await request.json();

    if (!title || !content || !classId) {
      return json({ error: 'Title, content, and class ID are required' }, { status: 400 });
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

    // If outlineId is provided, verify it belongs to the user
    if (outlineId) {
      const outline = await prisma.writingOutline.findFirst({
        where: {
          id: outlineId,
          userId: user.id,
        },
      });

      if (!outline) {
        return json({ error: 'Outline not found or access denied' }, { status: 404 });
      }
    }

    const draft = await prisma.writingDraft.create({
      data: {
        title,
        content,
        classId,
        userId: user.id,
        outlineId: outlineId || null,
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
        outline: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Create history record
    await createHistory({
      tableName: 'writing_drafts',
      recordId: draft.id,
      action: 'CREATE',
      newData: draft,
      userId: user.id,
      classId,
    });

    return json({ draft }, { status: 201 });
  } catch (error) {
    console.error('Create writing draft error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
