import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { analyticsService } from '$lib/analytics.js';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';

export const GET: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const user = getAuthUser(request);

    const analytics = await analyticsService.getUserAnalytics(user.id);

    return json({ analytics });
  } catch (error) {
    return apiError(error);
  }
};
