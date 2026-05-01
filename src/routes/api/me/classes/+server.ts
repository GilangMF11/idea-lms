import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';

export const GET: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const user = getAuthUser(request);

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
    return apiError(error);
  }
};
