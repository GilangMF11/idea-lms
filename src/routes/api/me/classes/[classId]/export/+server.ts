import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { exportService } from '$lib/export.js';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';
import { prisma } from '$lib/database.js';

export const POST: RequestHandler = async ({ request, params }: { request: any; params: any }) => {
  try {
    const user = getAuthUser(request);

    const classId = params.classId;

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

    const { format, includeData } = await request.json();

    if (!format || !includeData) {
      return json({ error: 'Format and includeData are required' }, { status: 400 });
    }

    const exportData = await exportService.exportClassData(classId, { format, includeData });

    return json({ data: exportData });
  } catch (error) {
    return apiError(error);
  }
};