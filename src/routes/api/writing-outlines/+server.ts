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

    const outlines = await prisma.writingOutline.findMany({
      where: {
        classId,
        isActive: true,
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
        _count: {
          select: {
            drafts: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return json({ outlines });
  } catch (error) {
    console.error('Get writing outlines error:', error);
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

    const { title, content, classId } = await request.json();

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

    const outline = await prisma.writingOutline.create({
      data: {
        title,
        content,
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
      },
    });

    // Create history record
    await createHistory({
      tableName: 'writing_outlines',
      recordId: outline.id,
      action: 'CREATE',
      newData: outline,
      userId: user.id,
      classId,
    });

    return json({ outline }, { status: 201 });
  } catch (error) {
    console.error('Create writing outline error:', error);
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
    if (!user) {
      return json({ error: 'Invalid token' }, { status: 401 });
    }

    const outlineId = url.searchParams.get('id');
    if (!outlineId) {
      return json({ error: 'Outline ID is required' }, { status: 400 });
    }

    const { title, content } = await request.json();

    if (!title && !content) {
      return json({ error: 'Title or content is required' }, { status: 400 });
    }

    // Check if outline exists and user has access
    const outline = await prisma.writingOutline.findFirst({
      where: {
        id: outlineId,
        userId: user.id,
      },
    });

    if (!outline) {
      return json({ error: 'Outline not found or access denied' }, { status: 404 });
    }

    const updatedOutline = await prisma.writingOutline.update({
      where: { id: outlineId },
      data: {
        ...(title && { title }),
        ...(content && { content }),
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
      tableName: 'writing_outlines',
      recordId: outline.id,
      action: 'UPDATE',
      oldData: outline,
      newData: updatedOutline,
      userId: user.id,
      classId: outline.classId,
    });

    return json({ outline: updatedOutline });
  } catch (error) {
    console.error('Update writing outline error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ request, url }) => {
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

    const outlineId = url.searchParams.get('id');
    if (!outlineId) {
      return json({ error: 'Outline ID is required' }, { status: 400 });
    }

    // Check if outline exists and user has access
    const outline = await prisma.writingOutline.findFirst({
      where: {
        id: outlineId,
        userId: user.id,
      },
    });

    if (!outline) {
      return json({ error: 'Outline not found or access denied' }, { status: 404 });
    }

    // Soft delete by setting isActive to false
    const deletedOutline = await prisma.writingOutline.update({
      where: { id: outlineId },
      data: { isActive: false },
    });

    // Create history record
    await createHistory({
      tableName: 'writing_outlines',
      recordId: outline.id,
      action: 'DELETE',
      oldData: outline,
      newData: deletedOutline,
      userId: user.id,
      classId: outline.classId,
    });

    return json({ message: 'Outline deleted successfully' });
  } catch (error) {
    console.error('Delete writing outline error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
