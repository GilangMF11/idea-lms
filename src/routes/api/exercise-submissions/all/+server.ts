import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';

export const GET: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const user = getAuthUser(request);

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
    return apiError(error);
  }
};
