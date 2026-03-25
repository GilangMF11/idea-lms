import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { verifyToken } from '$lib/auth.js';

// GET - Get user's group memberships for a class
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

    // Check access: Teacher of class or enrolled student
    if (classData.teacherId !== user.id && user.role !== 'ADMIN') {
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

    // Get user's group memberships in this class
    const memberships = await prisma.groupMember.findMany({
      where: {
        studentId: user.id,
        group: {
          classId
        }
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            description: true,
            classId: true
          }
        }
      },
      orderBy: {
        joinedAt: 'desc'
      }
    });

    return json({ memberships });
  } catch (error) {
    console.error('Get group memberships error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
