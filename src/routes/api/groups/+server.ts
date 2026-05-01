import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';

// GET - Get all groups for a class
export const GET: RequestHandler = async ({ request, url }: { request: any; url: any }) => {
  try {
    const user = getAuthUser(request);

    const classId = url.searchParams.get('classId');
    if (!classId) {
      return json({ error: 'Class ID is required' }, { status: 400 });
    }

    // Check if user has access to this class
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        teacher: true
      }
    });

    if (!classData) {
      return json({ error: 'Class not found' }, { status: 404 });
    }

    // Check access: Teacher of class or Admin
    if (classData.teacherId !== user.id && user.role !== 'ADMIN') {
      // Check if student is enrolled
      if (user.role === 'STUDENT') {
        const enrollment = await prisma.classStudent.findFirst({
          where: {
            classId,
            studentId: user.id
          }
        });
        if (!enrollment) {
          return json({ error: 'Access denied' }, { status: 403 });
        }
      } else {
        return json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Get groups with members
    const groups = await prisma.group.findMany({
      where: {
        classId,
        isActive: true
      },
      include: {
        members: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                username: true
              }
            }
          }
        },
        readingTexts: {
          select: {
            id: true,
            title: true
          }
        },
        _count: {
          select: {
            members: true,
            readingTexts: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return json({ groups });
  } catch (error) {
    return apiError(error);
  }
};

// POST - Create a new group
export const POST: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const user = getAuthUser(request);
    if (!user || !['TEACHER', 'ADMIN'].includes(user.role)) {
      return json({ error: 'Only teachers and admins can create groups' }, { status: 403 });
    }

    const { classId, lessonId, name, description, studentIds } = await request.json();

    if (!classId || !name) {
      return json({ error: 'Class ID and name are required' }, { status: 400 });
    }

    // Check if class exists and user is the teacher
    const classData = await prisma.class.findUnique({
      where: { id: classId }
    });

    if (!classData) {
      return json({ error: 'Class not found' }, { status: 404 });
    }

    if (classData.teacherId !== user.id && user.role !== 'ADMIN') {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    // Create group with members in a transaction
    const group = await prisma.$transaction(async (tx) => {
      // Verify that group model is available
      if (!tx.group) {
        throw new Error('Group model is not available. Please restart the server after migration.');
      }

      // Create the group
      const newGroup = await tx.group.create({
        data: {
          name,
          description: description || null,
          classId,
          lessonId: lessonId || null
        }
      });

      // Add members if provided
      if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
        // Verify all students are enrolled in the class
        const enrollments = await tx.classStudent.findMany({
          where: {
            classId,
            studentId: { in: studentIds }
          }
        });

        if (enrollments.length !== studentIds.length) {
          throw new Error('Some students are not enrolled in this class');
        }

        // Verify that groupMember model is available
        if (!tx.groupMember) {
          throw new Error('GroupMember model is not available. Please restart the server after migration.');
        }

        // Add members
        await tx.groupMember.createMany({
          data: studentIds.map((studentId: string) => ({
            groupId: newGroup.id,
            studentId
          }))
        });
      }

      // Return group with members
      return await tx.group.findUnique({
        where: { id: newGroup.id },
        include: {
          members: {
            include: {
              student: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  username: true
                }
              }
            }
          },
          _count: {
            select: {
              members: true,
              readingTexts: true
            }
          }
        }
      });
    });

    return json({ group }, { status: 201 });
  } catch (error: any) {
    console.error('Create group error:', error);
    return json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
};

