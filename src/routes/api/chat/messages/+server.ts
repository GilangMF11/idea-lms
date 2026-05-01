import { json } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import type { RequestHandler } from '@sveltejs/kit';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';

export const GET: RequestHandler = async ({ request, url }: { request: any; url: any }) => {
  try {
    const user = getAuthUser(request);

    const classId = url.searchParams.get('classId');
    const userId = url.searchParams.get('userId');

    if (!classId) {
      return json({ error: 'Class ID is required' }, { status: 400 });
    }

    if (!userId) {
      return json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if user has access to this class
    let classAccess = null;

    if (user.role === 'ADMIN') {
      // Admin can access any class
      classAccess = await prisma.class.findUnique({
        where: { id: classId },
      });
    } else if (user.role === 'TEACHER') {
      // Teacher can only access their own classes
      classAccess = await prisma.class.findFirst({
        where: {
          id: classId,
          teacherId: user.id,
        },
      });
    } else if (user.role === 'STUDENT') {
      // Student can only access their enrolled classes
      classAccess = await prisma.class.findFirst({
        where: {
          id: classId,
          students: { some: { studentId: user.id } },
        },
      });
    }

    if (!classAccess) {
      return json({ error: 'Access denied to this class' }, { status: 403 });
    }

    // Get chat messages for the specific user
    const messages = await prisma.chatMessage.findMany({
      where: {
        classId,
        userId,
        annotationId: {
          not: null, // Only include annotation discussions
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to last 50 messages
    });

    return json({ messages });
  } catch (error) {
    return apiError(error);
  }
};
