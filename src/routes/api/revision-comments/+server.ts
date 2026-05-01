import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';
import { createHistory } from '$lib/history.js';

export const GET: RequestHandler = async ({ request, url }: { request: any; url: any }) => {
  try {
    const user = getAuthUser(request);

    const revisionId = url.searchParams.get('revisionId');
    if (!revisionId) {
      return json({ error: 'Revision ID is required' }, { status: 400 });
    }

    // Check if user has access to this revision
    const revision = await prisma.revision.findFirst({
      where: {
        id: revisionId,
        class: {
          OR: [
            { teacherId: user.id },
            { students: { some: { studentId: user.id } } },
          ],
        },
      },
    });

    if (!revision) {
      return json({ error: 'Revision not found or access denied' }, { status: 404 });
    }

    const comments = await prisma.revisionComment.findMany({
      where: { revisionId },
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
    });

    return json({ comments });
  } catch (error) {
    return apiError(error);
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const user = getAuthUser(request);

    const { revisionId, comment } = await request.json();

    if (!revisionId || !comment) {
      return json({ error: 'Revision ID and comment are required' }, { status: 400 });
    }

    // Check if user has access to this revision
    const revision = await prisma.revision.findFirst({
      where: {
        id: revisionId,
        class: {
          OR: [
            { teacherId: user.id },
            { students: { some: { studentId: user.id } } },
          ],
        },
      },
    });

    if (!revision) {
      return json({ error: 'Revision not found or access denied' }, { status: 404 });
    }

    const revisionComment = await prisma.revisionComment.create({
      data: {
        revisionId,
        userId: user.id,
        comment,
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
      tableName: 'revision_comments',
      recordId: revisionComment.id,
      action: 'CREATE',
      newData: revisionComment,
      userId: user.id,
      classId: revision.classId,
    });

    return json({ comment: revisionComment }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
};
