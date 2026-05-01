import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';
import { createHistory } from '$lib/history.js';


export const GET: RequestHandler = async ({ request, url }: { request: any; url: any }) => {
  try {
    const user = getAuthUser(request);

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
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;
        const search = url.searchParams.get('search') || '';
        const teacherId = url.searchParams.get('teacherId') || '';

        const whereClause: any = {};
        
        if (search) {
          whereClause.OR = [
            { name: { contains: search } },
            { description: { contains: search } },
            { teacher: { firstName: { contains: search } } },
            { teacher: { lastName: { contains: search } } }
          ];
        }

        if (teacherId) {
          whereClause.teacherId = teacherId;
        }

        const [fetchedClasses, total] = await Promise.all([
          prisma.class.findMany({
            where: whereClause,
            skip,
            take: limit,
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
          }),
          prisma.class.count({ where: whereClause })
        ]);
        
        return json({ 
          classes: fetchedClasses, 
          pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } 
        });
      } else if (user.role === 'TEACHER') {
        classes = await prisma.class.findMany({
          where: {
            teacherId: user.id,
            isActive: true,
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
            isActive: true,
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
    return apiError(error);
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const user = getAuthUser(request);
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
    return apiError(error);
  }
};
