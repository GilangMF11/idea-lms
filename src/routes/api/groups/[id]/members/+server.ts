import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { verifyToken } from '$lib/auth.js';

// POST - Add member to group
export const POST: RequestHandler = async ({ request, params }: { request: any; params: any }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (!user || !['TEACHER', 'ADMIN'].includes(user.role)) {
      return json({ error: 'Only teachers and admins can add members to groups' }, { status: 403 });
    }

    const groupId = params.id;
    const { studentId, role } = await request.json();

    if (!studentId) {
      return json({ error: 'Student ID is required' }, { status: 400 });
    }

    // Get group and check access
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        class: {
          select: {
            teacherId: true
          }
        }
      }
    });

    if (!group) {
      return json({ error: 'Group not found' }, { status: 404 });
    }

    if (group.class.teacherId !== user.id && user.role !== 'ADMIN') {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if student is enrolled in the class
    const enrollment = await prisma.classStudent.findFirst({
      where: {
        classId: group.classId,
        studentId
      }
    });

    if (!enrollment) {
      return json({ error: 'Student is not enrolled in this class' }, { status: 400 });
    }

    // Check if already a member
    const existingMember = await prisma.groupMember.findFirst({
      where: {
        groupId,
        studentId
      }
    });

    if (existingMember) {
      return json({ error: 'Student is already a member of this group' }, { status: 400 });
    }

    // Add member
    const member = await prisma.groupMember.create({
      data: {
        groupId,
        studentId,
        role: role || null
      },
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
    });

    return json({ member }, { status: 201 });
  } catch (error) {
    console.error('Add group member error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

// DELETE - Remove member from group
export const DELETE: RequestHandler = async ({ request, params, url }: { request: any; params: any; url: any }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (!user || !['TEACHER', 'ADMIN'].includes(user.role)) {
      return json({ error: 'Only teachers and admins can remove members from groups' }, { status: 403 });
    }

    const groupId = params.id;
    const studentId = url.searchParams.get('studentId');

    if (!studentId) {
      return json({ error: 'Student ID is required' }, { status: 400 });
    }

    // Get group and check access
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        class: {
          select: {
            teacherId: true
          }
        }
      }
    });

    if (!group) {
      return json({ error: 'Group not found' }, { status: 404 });
    }

    if (group.class.teacherId !== user.id && user.role !== 'ADMIN') {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    // Remove member
    await prisma.groupMember.deleteMany({
      where: {
        groupId,
        studentId
      }
    });

    return json({ success: true });
  } catch (error) {
    console.error('Remove group member error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

