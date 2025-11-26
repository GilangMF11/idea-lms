import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { verifyToken } from '$lib/auth.js';

export const POST: RequestHandler = async ({ request }: { request: any }) => {
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

    // Only students can self-enroll
    if (user.role !== 'STUDENT') {
      return json({ error: 'Only students can enroll themselves' }, { status: 403 });
    }

    const { classId } = await request.json();

    if (!classId) {
      return json({ error: 'Class ID is required' }, { status: 400 });
    }

    // Check if class exists
    const classData = await prisma.class.findUnique({
      where: { id: classId }
    });

    if (!classData) {
      return json({ error: 'Class not found' }, { status: 404 });
    }

    // Check if student is already enrolled
    const existingEnrollment = await prisma.classStudent.findFirst({
      where: {
        classId,
        studentId: user.id
      }
    });

    if (existingEnrollment) {
      return json({ error: 'You are already enrolled in this class' }, { status: 400 });
    }

    // Enroll student to class
    const enrollment = await prisma.classStudent.create({
      data: {
        classId,
        studentId: user.id
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            description: true,
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              }
            }
          }
        }
      }
    });

    return json({ 
      enrollment,
      message: 'Successfully enrolled in class'
    }, { status: 201 });
  } catch (error) {
    console.error('Enroll to class error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

