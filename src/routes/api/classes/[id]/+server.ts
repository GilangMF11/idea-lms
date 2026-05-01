import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';
import { createHistory } from '$lib/history.js';

export const DELETE: RequestHandler = async ({ request, params }) => {
  try {
    const user = getAuthUser(request);

    const classId = params.id;
    const url = new URL(request.url);
    const isPermanent = url.searchParams.get('permanent') === 'true';

    if (!classId) {
      return json({ error: 'Class ID is required' }, { status: 400 });
    }

    const classData = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classData) {
      return json({ error: 'Class not found' }, { status: 404 });
    }

    // Authorization check
    if (user.role === 'STUDENT') {
      return json({ error: 'Access denied' }, { status: 403 });
    } else if (user.role === 'TEACHER' && classData.teacherId !== user.id) {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    if (isPermanent && user.role === 'ADMIN') {
      // Perform hard delete
      await prisma.class.delete({
        where: { id: classId },
      });
      return json({ success: true, message: 'Class permanently deleted' });
    }

    // Perform soft delete
    const deletedClass = await prisma.class.update({
      where: { id: classId },
      data: { isActive: false },
    });

    // Create history record
    await createHistory({
      tableName: 'classes',
      recordId: deletedClass.id,
      action: 'DELETE',
      oldData: classData,
      newData: deletedClass,
      userId: user.id,
      classId: deletedClass.id,
    });

    return json({ success: true, message: 'Class deleted successfully' });
  } catch (error) {
    return apiError(error);
  }
};
