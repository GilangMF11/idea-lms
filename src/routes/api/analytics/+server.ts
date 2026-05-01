import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { analyticsService } from '$lib/analytics.js';
import { getAuthUser, apiError } from '$lib/api-utils.js';
import { prisma } from '$lib/database.js';

export const GET: RequestHandler = async ({ request, url }) => {
  try {
    const user = getAuthUser(request);

    const classId = url.searchParams.get('classId');
    const type = url.searchParams.get('type') || 'user';

    if (type === 'class' && classId) {
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
    }

    if (type === 'user') {
      const analytics = await analyticsService.getUserAnalytics(user.id);
      return json({ analytics });
    }

    if (type === 'teacher' && user.role === 'TEACHER') {
      const analytics = await analyticsService.getTeacherAnalytics(user.id);
      return json({ analytics });
    }

    if (type === 'system' && user.role === 'ADMIN') {
      const analytics = await analyticsService.getSystemAnalytics();
      return json({ analytics });
    }

    return json({ error: 'Invalid analytics type' }, { status: 400 });
  } catch (error) {
    return apiError(error);
  }
};

