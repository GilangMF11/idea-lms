import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { analyticsService } from '$lib/analytics.js';
import { verifyToken } from '$lib/auth.js';
import { prisma } from '$lib/database.js';

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

    if (type === 'system' && user.role === 'ADMIN') {
      const analytics = await analyticsService.getSystemAnalytics();
      return json({ analytics });
    }

    return json({ error: 'Invalid analytics type' }, { status: 400 });
  } catch (error) {
    console.error('Analytics error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
