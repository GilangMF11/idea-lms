import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { rateLimiter } from '$lib/rate-limiter.js';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';

export const GET: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const user = getAuthUser(request);

    const limits = {
      ai: rateLimiter.getStatus(user.id, 'ai_request'),
      chat: rateLimiter.getStatus(user.id, 'chat'),
      annotation: rateLimiter.getStatus(user.id, 'annotation'),
    };

    return json({ limits });
  } catch (error) {
    return apiError(error);
  }
};
