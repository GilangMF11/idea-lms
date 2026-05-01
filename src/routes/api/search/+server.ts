import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { searchService } from '$lib/search.js';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';

export const GET: RequestHandler = async ({ request, url }: { request: any; url: any }) => {
  try {
    const user = getAuthUser(request);

    const query = url.searchParams.get('q');
    const classId = url.searchParams.get('classId');
    const type = url.searchParams.get('type') || 'all';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (!query) {
      return json({ error: 'Search query is required' }, { status: 400 });
    }

    const results = await searchService.search({
      query,
      classId: classId || undefined,
      userId: user.role === 'STUDENT' ? user.id : undefined,
      type: type as any,
      limit,
      offset,
    });

    return json({ results });
  } catch (error) {
    return apiError(error);
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const user = getAuthUser(request);

    const { query, classId } = await request.json();

    if (!query) {
      return json({ error: 'Search query is required' }, { status: 400 });
    }

    const suggestions = await searchService.getSearchSuggestions(query, classId);

    return json({ suggestions });
  } catch (error) {
    return apiError(error);
  }
};
