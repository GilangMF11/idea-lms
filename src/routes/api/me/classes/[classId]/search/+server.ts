import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { searchService } from '$lib/search.js';
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

    const query = url.searchParams.get('q');
    const type = url.searchParams.get('type') || 'all';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (!query) {
      return json({ error: 'Search query is required' }, { status: 400 });
    }

    const results = await searchService.search({
      query,
      classId,
      userId: user.role === 'STUDENT' ? user.id : undefined,
      type: type as any,
      limit,
      offset,
    });

    return json({ results });
  } catch (error) {
    console.error('Search in class error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, params }) => {
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

    const { query } = await request.json();

    if (!query) {
      return json({ error: 'Search query is required' }, { status: 400 });
    }

    const suggestions = await searchService.getSearchSuggestions(query, classId);

    return json({ suggestions });
  } catch (error) {
    console.error('Get search suggestions error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};