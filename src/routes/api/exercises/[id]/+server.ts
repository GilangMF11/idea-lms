import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';

export const GET: RequestHandler = async ({ request, params }: { request: any; params: any }) => {
  try {
    const user = getAuthUser(request);

    const exerciseId = params.id;

    if (!exerciseId) {
      return json({ error: 'Exit ticket ID is required' }, { status: 400 });
    }

    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            teacherId: true
          }
        },
        readingText: {
          select: {
            id: true,
            title: true,
            content: true,
            author: true,
            source: true,
            timerDuration: true
          }
        }
      }
    });

    if (!exercise) {
      return json({ error: 'Exit ticket not found' }, { status: 404 });
    }

    // Check access permissions
    if (user.role === 'STUDENT') {
      // Check if student is enrolled in the class
      const enrollment = await prisma.classStudent.findFirst({
        where: {
          classId: exercise.classId,
          studentId: user.id
        }
      });

      if (!enrollment) {
        return json({ error: 'Access denied' }, { status: 403 });
      }
    } else if (user.role === 'TEACHER') {
      // Check if teacher owns the class
      if (exercise.class.teacherId !== user.id) {
        return json({ error: 'Access denied' }, { status: 403 });
      }
    }

    return json({ exercise });
  } catch (error) {
    return apiError(error);
  }
};
