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

    let classes;

    if (user.role === 'ADMIN') {
      // Admin can see all classes
      classes = await prisma.class.findMany({
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
            include: {
              student: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
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
    } else if (user.role === 'TEACHER') {
      // Teacher can see their own classes
      classes = await prisma.class.findMany({
        where: {
          teacherId: user.id,
        },
        include: {
          students: {
            include: {
              student: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
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
    } else {
      // Student can see classes they're enrolled in
      classes = await prisma.class.findMany({
        where: {
          students: {
            some: {
              studentId: user.id,
            },
          },
        },
        include: {
          teacher: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
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
    }

    return json({ classes });
  } catch (error) {
    console.error('Get user classes error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
