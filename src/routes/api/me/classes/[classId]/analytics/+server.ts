import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { analyticsService } from '$lib/analytics.js';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';
import { prisma } from '$lib/database.js';

export const GET: RequestHandler = async ({ request, params }: { request: any; params: any }) => {
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

    const analytics = await analyticsService.getClassAnalytics(classId);

    return json({ analytics });
  } catch (error) {
    return apiError(error);
  }
};
