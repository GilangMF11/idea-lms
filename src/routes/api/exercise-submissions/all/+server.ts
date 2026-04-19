import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
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

    // Only students can fetch all their own submissions
    if (user.role !== 'STUDENT') {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    const submissions = await prisma.exerciseSubmission.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        exerciseId: true,
        score: true,
        feedback: true,
        submittedAt: true,
        updatedAt: true,
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    return json({ submissions });
  } catch (error) {
    console.error('Get all submissions error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
