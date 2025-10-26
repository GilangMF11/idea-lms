import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { verifyToken } from '$lib/auth.js';

export const GET: RequestHandler = async ({ request, params }: { request: any; params: any }) => {
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

    const exerciseId = params.id;

    if (!exerciseId) {
      return json({ error: 'Exercise ID is required' }, { status: 400 });
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
            title: true
          }
        }
      }
    });

    if (!exercise) {
      return json({ error: 'Exercise not found' }, { status: 404 });
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
    console.error('Get exercise error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
