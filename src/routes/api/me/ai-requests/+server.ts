import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getRemainingAIRequests } from '$lib/ai.js';
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

    const remaining = getRemainingAIRequests(user.id);
    const limit = 5;

    return json({ 
      remaining,
      limit,
      used: limit - remaining,
    });
  } catch (error) {
    console.error('Get AI requests error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
