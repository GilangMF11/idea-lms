import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { rateLimiter } from '$lib/rate-limiter.js';
import { verifyToken } from '$lib/auth.js';

export const GET: RequestHandler = async ({ request }: { request: any }) => {
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

    const limits = {
      ai: rateLimiter.getStatus(user.id, 'ai_request'),
      chat: rateLimiter.getStatus(user.id, 'chat'),
      annotation: rateLimiter.getStatus(user.id, 'annotation'),
    };

    return json({ limits });
  } catch (error) {
    console.error('Get rate limits error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
