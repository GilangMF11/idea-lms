import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';

export const GET: RequestHandler = async ({ request, url }: { request: any; url: any }) => {
  try {
    const user = getAuthUser(request);

    const classIdParam = url.searchParams.get('classId');
    const readingTextId = url.searchParams.get('readingTextId');

    let exercises;
    let effectiveClassId = classIdParam;
    let readingTextForAccess: any = null;

    if (readingTextId) {
      readingTextForAccess = await prisma.readingText.findUnique({
        where: { id: readingTextId },
        include: { class: true }
      });

      if (!readingTextForAccess) {
        return json({ error: 'Reading text not found' }, { status: 404 });
      }

      effectiveClassId = readingTextForAccess.classId;
    }

    if (effectiveClassId) {
      // Get exercises for specific class
      if (user.role === 'STUDENT') {
        // Check if student is enrolled in the class
        const enrollment = await prisma.classStudent.findFirst({
          where: {
            classId: effectiveClassId,
            studentId: user.id
          }
        });

        if (!enrollment) {
          return json({ error: 'Access denied' }, { status: 403 });
        }
      } else if (user.role === 'TEACHER') {
        // Check if teacher owns the class
        let classData = readingTextForAccess?.class;
        if (!classData) {
          classData = await prisma.class.findUnique({
            where: { id: effectiveClassId }
          });
        }

        if (!classData || classData.teacherId !== user.id) {
          return json({ error: 'Access denied' }, { status: 403 });
        }
      }

      const whereClause: any = { classId: effectiveClassId };
      if (readingTextId) {
        whereClause.readingTextId = readingTextId;
      }

      exercises = await prisma.exercise.findMany({
        where: whereClause,
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
              title: true,
              timerDuration: true
            } as any
          },
          _count: {
            select: {
              submissions: true
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
                title: true,
                timerDuration: true
              } as any
            },
            _count: {
              select: {
                submissions: true
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
    return apiError(error);
  }
};

export const POST: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const user = getAuthUser(request);
    if (!user || user.role !== 'TEACHER') {
      return json({ error: 'Only teachers can create exercises' }, { status: 403 });
    }

    const {
      title,
      description,
      content,
      classId,
      lessonId,
      readingTextId,
      dueDate,
      timerDuration,
      autoSubmitOnTimeout = true,
      minWords,
      maxWords
    } = await request.json();

    if (!title || !classId) {
      return json({ error: 'Title and Class ID are required' }, { status: 400 });
    }

    if (!lessonId) {
      return json({ error: 'Lesson ID is required' }, { status: 400 });
    }

    if (!content || !content.trim()) {
      return json({ error: 'Exit ticket content is required' }, { status: 400 });
    }

    let normalizedTimerDuration: number | null = null;
    if (timerDuration !== undefined && timerDuration !== null && timerDuration !== '') {
      const parsed = Number(timerDuration);
      if (Number.isNaN(parsed) || parsed < 0) {
        return json({ error: 'Timer duration must be a non-negative number' }, { status: 400 });
      }
      normalizedTimerDuration = parsed;
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
        description: description || null,
        content,
        classId,
        lessonId,
        readingTextId: readingTextId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        ...(normalizedTimerDuration !== null && { timerDuration: normalizedTimerDuration }),
        ...(autoSubmitOnTimeout !== undefined && { autoSubmitOnTimeout: Boolean(autoSubmitOnTimeout) }),
        ...(minWords !== undefined && minWords !== null && { minWords: Number(minWords) }),
        ...(maxWords !== undefined && maxWords !== null && { maxWords: Number(maxWords) })
      } as any,
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
    return apiError(error);
  }
};

export const PUT: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const user = getAuthUser(request);
    if (!user || user.role !== 'TEACHER') {
      return json({ error: 'Only teachers can update exercises' }, { status: 403 });
    }

    const {
      id,
      title,
      description,
      content,
      dueDate,
      timerDuration,
      autoSubmitOnTimeout,
      minWords,
      maxWords
    } = await request.json();

    if (!id) {
      return json({ error: 'Exit ticket ID is required' }, { status: 400 });
    }

    // Check if exercise exists and user is the teacher
    const existingExercise = await prisma.exercise.findUnique({
      where: { id },
      include: {
        class: true
      }
    });

    if (!existingExercise) {
      return json({ error: 'Exit ticket not found' }, { status: 404 });
    }

    if (existingExercise.class.teacherId !== user.id) {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    // Update exercise
    let normalizedTimerDuration: number | null = null;
    if (timerDuration !== undefined && timerDuration !== null && timerDuration !== '') {
      const parsed = Number(timerDuration);
      if (Number.isNaN(parsed) || parsed < 0) {
        return json({ error: 'Timer duration must be a non-negative number' }, { status: 400 });
      }
      normalizedTimerDuration = parsed;
    }

    const exercise = await prisma.exercise.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existingExercise.title,
        description: description !== undefined ? description : existingExercise.description,
        content: content !== undefined ? content : existingExercise.content,
        dueDate: dueDate ? new Date(dueDate) : existingExercise.dueDate,
        ...(timerDuration !== undefined && { timerDuration: normalizedTimerDuration }),
        ...(autoSubmitOnTimeout !== undefined && { autoSubmitOnTimeout: Boolean(autoSubmitOnTimeout) }),
        ...(minWords !== undefined && { minWords: minWords ? Number(minWords) : null }),
        ...(maxWords !== undefined && { maxWords: maxWords ? Number(maxWords) : null })
      } as any,
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
    return apiError(error);
  }
};

export const DELETE: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const user = getAuthUser(request);
    if (!user || user.role !== 'TEACHER') {
      return json({ error: 'Only teachers can delete exercises' }, { status: 403 });
    }

    const { id } = await request.json();

    if (!id) {
      return json({ error: 'Exit ticket ID is required' }, { status: 400 });
    }

    // Check if exercise exists and user is the teacher
    const existingExercise = await prisma.exercise.findUnique({
      where: { id },
      include: {
        class: true
      }
    });

    if (!existingExercise) {
      return json({ error: 'Exit ticket not found' }, { status: 404 });
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
    return apiError(error);
  }
};