import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getHistoryByClass } from '$lib/history.js';
import { verifyToken } from '$lib/auth.js';
import { prisma } from '$lib/database.js';

export const GET: RequestHandler = async ({ request, params, url }: { request: any; params: any; url: any }) => {
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
    console.error('Get class history error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};