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

    // Only students can see available classes
    if (user.role !== 'STUDENT') {
      return json({ error: 'Only students can view available classes' }, { status: 403 });
    }

    // Get all classes with enrollment status
    const allClasses = await prisma.class.findMany({
      include: {
        teacher: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        students: {
          where: {
            studentId: user.id
          },
          select: {
            studentId: true
          }
        },
        _count: {
          select: {
            students: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Add enrollment status to each class
    const classesWithStatus = allClasses.map(classItem => ({
      ...classItem,
      isEnrolled: classItem.students.length > 0,
      students: undefined // Remove students array from response
    }));

    return json({ classes: classesWithStatus });
  } catch (error) {
    console.error('Get available classes error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

