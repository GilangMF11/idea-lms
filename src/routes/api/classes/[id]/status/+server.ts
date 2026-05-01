import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';
import { createHistory } from '$lib/history.js';

export const PATCH: RequestHandler = async ({ request, params }) => {
  try {
    const user = getAuthUser(request);
    requireAdmin(user);

    const classId = params.id;
    if (!classId) return json({ error: 'Class ID required' }, { status: 400 });

    const { isActive } = await request.json();

    const classData = await prisma.class.findUnique({ where: { id: classId } });
    if (!classData) return json({ error: 'Class not found' }, { status: 404 });

    const updatedClass = await prisma.class.update({
      where: { id: classId },
      data: { isActive },
    });

    await createHistory({
      tableName: 'classes',
      recordId: updatedClass.id,
      action: 'UPDATE',
      oldData: classData,
      newData: updatedClass,
      userId: user.id,
      classId: updatedClass.id,
    });

    return json({ success: true, class: updatedClass });
  } catch (error) {
    return apiError(error);
  }
};
