import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getRemainingAIRequests } from '$lib/ai.js';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';

export const GET: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const user = getAuthUser(request);

    const remaining = getRemainingAIRequests(user.id);
    const limit = 5;

    return json({ 
      remaining,
      limit,
      used: limit - remaining,
    });
  } catch (error) {
    return apiError(error);
  }
};
