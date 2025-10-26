import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { verifyToken } from '$lib/auth.js';
import { generateAIFeedback, checkAIRequestLimit, getRemainingAIRequests } from '$lib/ai.js';

export const POST: RequestHandler = async ({ request }: { request: any }) => {
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

    // Check AI request limit
    if (!checkAIRequestLimit(user.id)) {
      const remaining = getRemainingAIRequests(user.id);
      return json(
        { 
          error: 'AI request limit exceeded', 
          remaining,
          limit: 5 
        }, 
        { status: 429 }
      );
    }

    const { content, type } = await request.json();

    if (!content) {
      return json({ error: 'Content is required' }, { status: 400 });
    }

    const feedback = await generateAIFeedback(content, type);
    const remaining = getRemainingAIRequests(user.id);

    return json({ 
      feedback,
      remaining,
      limit: 5 
    });
  } catch (error) {
    console.error('AI feedback error:', error);
    return json({ error: 'Failed to generate AI feedback' }, { status: 500 });
  }
};
