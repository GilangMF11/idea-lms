import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { verifyToken } from '$lib/auth.js';

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

    const classId = url.searchParams.get('classId');
    
    let exercises;
    
    if (classId) {
      // Get exercises for specific class
      if (user.role === 'STUDENT') {
        // Check if student is enrolled in the class
        const enrollment = await prisma.classStudent.findFirst({
          where: {
            classId,
            studentId: user.id
          }
        });

        if (!enrollment) {
          return json({ error: 'Access denied' }, { status: 403 });
        }
      } else if (user.role === 'TEACHER') {
        // Check if teacher owns the class
        const classData = await prisma.class.findUnique({
          where: { id: classId }
        });

        if (!classData || classData.teacherId !== user.id) {
          return json({ error: 'Access denied' }, { status: 403 });
        }
      }

      exercises = await prisma.exercise.findMany({
        where: { classId },
        include: {
          class: {
            select: {
              id: true,
              name: true
            }
          },
          readingText: {
            select: {
              id: true,
              title: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } else {
      // Get all exercises based on user role
      if (user.role === 'STUDENT') {
        // Get exercises from classes where student is enrolled
        const studentClasses = await prisma.classStudent.findMany({
          where: { studentId: user.id },
          select: { classId: true }
        });

        const classIds = studentClasses.map(sc => sc.classId);

        exercises = await prisma.exercise.findMany({
          where: {
            classId: { in: classIds }
          },
          include: {
            class: {
              select: {
                id: true,
                name: true
              }
            },
            readingText: {
              select: {
                id: true,
                title: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      } else if (user.role === 'TEACHER') {
        // Get exercises from classes where user is teacher
        exercises = await prisma.exercise.findMany({
          where: {
            class: {
              teacherId: user.id
            }
          },
          include: {
            class: {
              select: {
                id: true,
                name: true
              }
            },
            readingText: {
              select: {
                id: true,
                title: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      } else {
        // Admin can see all exercises
        exercises = await prisma.exercise.findMany({
          include: {
            class: {
              select: {
                id: true,
                name: true
              }
            },
            readingText: {
              select: {
                id: true,
                title: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      }
    }

    return json({ exercises });
  } catch (error) {
    console.error('Get exercises error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (!user || user.role !== 'TEACHER') {
      return json({ error: 'Only teachers can create exercises' }, { status: 403 });
    }

    const { title, description, instructions, classId, readingTextId, dueDate, points } = await request.json();

    if (!title || !classId) {
      return json({ error: 'Title and Class ID are required' }, { status: 400 });
    }

    // Check if class exists and user is the teacher
    const classData = await prisma.class.findUnique({
      where: { id: classId }
    });

    if (!classData) {
      return json({ error: 'Class not found' }, { status: 404 });
    }

    if (classData.teacherId !== user.id) {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    // Create exercise
    const exercise = await prisma.exercise.create({
      data: {
        title,
        description,
        instructions,
        classId,
        readingTextId: readingTextId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        points: points || 100,
        createdBy: user.id
      },
      include: {
        class: {
          select: {
            id: true,
            name: true
          }
        },
        readingText: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    return json({ exercise }, { status: 201 });
  } catch (error) {
    console.error('Create exercise error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (!user || user.role !== 'TEACHER') {
      return json({ error: 'Only teachers can update exercises' }, { status: 403 });
    }

    const { id, title, description, instructions, dueDate, points } = await request.json();

    if (!id) {
      return json({ error: 'Exercise ID is required' }, { status: 400 });
    }

    // Check if exercise exists and user is the teacher
    const existingExercise = await prisma.exercise.findUnique({
      where: { id },
      include: {
        class: true
      }
    });

    if (!existingExercise) {
      return json({ error: 'Exercise not found' }, { status: 404 });
    }

    if (existingExercise.class.teacherId !== user.id) {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    // Update exercise
    const exercise = await prisma.exercise.update({
      where: { id },
      data: {
        title: title || existingExercise.title,
        description: description !== undefined ? description : existingExercise.description,
        instructions: instructions || existingExercise.instructions,
        dueDate: dueDate ? new Date(dueDate) : existingExercise.dueDate,
        points: points || existingExercise.points
      },
      include: {
        class: {
          select: {
            id: true,
            name: true
          }
        },
        readingText: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    return json({ exercise });
  } catch (error) {
    console.error('Update exercise error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (!user || user.role !== 'TEACHER') {
      return json({ error: 'Only teachers can delete exercises' }, { status: 403 });
    }

    const { id } = await request.json();

    if (!id) {
      return json({ error: 'Exercise ID is required' }, { status: 400 });
    }

    // Check if exercise exists and user is the teacher
    const existingExercise = await prisma.exercise.findUnique({
      where: { id },
      include: {
        class: true
      }
    });

    if (!existingExercise) {
      return json({ error: 'Exercise not found' }, { status: 404 });
    }

    if (existingExercise.class.teacherId !== user.id) {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete exercise
    await prisma.exercise.delete({
      where: { id }
    });

    return json({ success: true });
  } catch (error) {
    console.error('Delete exercise error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};