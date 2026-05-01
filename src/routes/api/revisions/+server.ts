import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';
import { createHistory } from '$lib/history.js';

export const GET: RequestHandler = async ({ request, url }: { request: any; url: any }) => {
  try {
    const user = getAuthUser(request);

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

    const revisions = await prisma.revision.findMany({
      where: {
        draftId,
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
        comments: {
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
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return json({ revisions });
  } catch (error) {
    return apiError(error);
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const user = getAuthUser(request);

    const { draftId, classId, content, feedback } = await request.json();

    if (!draftId || !classId || !content) {
      return json({ error: 'Draft ID, class ID, and content are required' }, { status: 400 });
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

    const revision = await prisma.revision.create({
      data: {
        draftId,
        classId,
        userId: user.id,
        content,
        feedback: feedback || null,
        status: 'PENDING',
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
      tableName: 'revisions',
      recordId: revision.id,
      action: 'CREATE',
      newData: revision,
      userId: user.id,
      classId,
    });

    return json({ revision }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
};

export const PATCH: RequestHandler = async ({ request, url }) => {
  try {
    const user = getAuthUser(request);
    if (!user || user.role !== 'TEACHER') {
      return json({ error: 'Only teachers can update revision status' }, { status: 403 });
    }

    const revisionId = url.searchParams.get('id');
    if (!revisionId) {
      return json({ error: 'Revision ID is required' }, { status: 400 });
    }

    const { status, feedback } = await request.json();

    if (!status) {
      return json({ error: 'Status is required' }, { status: 400 });
    }

    const revision = await prisma.revision.findFirst({
      where: {
        id: revisionId,
      },
      include: {
        class: true,
      },
    });

    if (!revision) {
      return json({ error: 'Revision not found' }, { status: 404 });
    }

    // Check if teacher has access to this class
    if (revision.class.teacherId !== user.id) {
      return json({ error: 'Access denied to this revision' }, { status: 403 });
    }

    const updatedRevision = await prisma.revision.update({
      where: {
        id: revisionId,
      },
      data: {
        status,
        feedback: feedback || revision.feedback,
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
      tableName: 'revisions',
      recordId: revision.id,
      action: 'UPDATE',
      oldData: revision,
      newData: updatedRevision,
      userId: user.id,
      classId: revision.classId,
    });

    return json({ revision: updatedRevision });
  } catch (error) {
    return apiError(error);
  }
};
