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

    const finalProducts = await prisma.finalProduct.findMany({
      where: {
        classId,
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
        draft: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return json({ finalProducts });
  } catch (error) {
    console.error('Get final products error:', error);
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

    const { title, content, draftId, classId } = await request.json();

    if (!title || !content || !draftId || !classId) {
      return json({ error: 'All fields are required' }, { status: 400 });
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

    // Check if draft exists and belongs to the user
    const draft = await prisma.writingDraft.findFirst({
      where: {
        id: draftId,
        userId: user.id,
        classId,
      },
    });

    if (!draft) {
      return json({ error: 'Draft not found or access denied' }, { status: 404 });
    }

    // Check if there's an approved revision for this draft
    const approvedRevision = await prisma.revision.findFirst({
      where: {
        draftId,
        status: 'APPROVED',
      },
    });

    if (!approvedRevision) {
      return json({ error: 'Draft must be approved before creating final product' }, { status: 400 });
    }

    const finalProduct = await prisma.finalProduct.create({
      data: {
        title,
        content,
        draftId,
        userId: user.id,
        classId,
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
        draft: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Create history record
    await createHistory({
      tableName: 'final_products',
      recordId: finalProduct.id,
      action: 'CREATE',
      newData: finalProduct,
      userId: user.id,
      classId,
    });

    return json({ finalProduct }, { status: 201 });
  } catch (error) {
    console.error('Create final product error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
