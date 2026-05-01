import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getHistoryByClass } from '$lib/history.js';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';
import { prisma } from '$lib/database.js';

export const GET: RequestHandler = async ({ request, params, url }: { request: any; params: any; url: any }) => {
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

    const limit = parseInt(url.searchParams.get('limit') || '50');

    const history = await getHistoryByClass(classId, limit);

    return json({ history });
  } catch (error) {
    return apiError(error);
  }
};