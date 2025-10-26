import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { verifyToken } from '$lib/auth.js';
import { createHistory } from '$lib/history.js';


export const GET: RequestHandler = async ({ request, url }: { request: any; url: any }) => {
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

    const classId = url.searchParams.get('id');
    
    if (classId) {
      // Get single class by ID
      const classData = await prisma.class.findUnique({
        where: { id: classId },
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
      });

      if (!classData) {
        return json({ error: 'Class not found' }, { status: 404 });
      }

      // Check if user has access to this class
      if (user.role === 'STUDENT') {
        const hasAccess = classData.students.some(cs => cs.studentId === user.id);
        if (!hasAccess) {
          return json({ error: 'Access denied' }, { status: 403 });
        }
      } else if (user.role === 'TEACHER' && classData.teacherId !== user.id) {
        return json({ error: 'Access denied' }, { status: 403 });
      }

      return json({ class: classData });
    } else {
      // Get all classes (existing logic)
      let classes;
      if (user.role === 'ADMIN') {
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
    }
  } catch (error) {
    console.error('Get classes error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (!user || user.role !== 'TEACHER') {
      return json({ error: 'Only teachers can create classes' }, { status: 403 });
    }

    const { name, description } = await request.json();

    if (!name) {
      return json({ error: 'Class name is required' }, { status: 400 });
    }

    // Generate unique class code
    const code = `CLS${Date.now().toString().slice(-6)}`;

    const newClass = await prisma.class.create({
      data: {
        name,
        description,
        code,
        teacherId: user.id,
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
      },
    });

    // Create history record
    await createHistory({
      tableName: 'classes',
      recordId: newClass.id,
      action: 'CREATE',
      newData: newClass,
      userId: user.id,
      classId: newClass.id,
    });

    return json({ class: newClass }, { status: 201 });
  } catch (error) {
    console.error('Create class error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
