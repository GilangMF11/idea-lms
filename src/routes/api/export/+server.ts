import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { exportService } from '$lib/export.js'; 
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';
import { prisma } from '$lib/database.js';

export const POST: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const user = getAuthUser(request);

    const { classId, userId, format, includeData } = await request.json();

    if (!format || !includeData) {
      return json({ error: 'Format and includeData are required' }, { status: 400 });
    }

    let exportData;

    if (classId) {
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

      exportData = await exportService.exportClassData(classId, { format, includeData });
    } else if (userId) {
      // Check if user is accessing their own data or is admin
      if (user.id !== userId && user.role !== 'ADMIN') {
        return json({ error: 'Access denied' }, { status: 403 });
      }

      exportData = await exportService.exportUserData(userId, { format, includeData });
    } else {
      return json({ error: 'ClassId or userId is required' }, { status: 400 });
    }

    return json({ data: exportData });
  } catch (error) {
    return apiError(error);
  }
};
