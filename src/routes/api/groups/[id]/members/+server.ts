import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';

// POST - Add member to group (teacher can add student, student can join themselves)
export const POST: RequestHandler = async ({ request, params }: { request: any; params: any }) => {
  try {
    const user = getAuthUser(request);

    const groupId = params.id;
    const { studentId, role } = await request.json();

    // Determine if user is joining themselves or teacher is adding a student
    const isStudentJoiningThemselves = user.role === 'STUDENT' && (!studentId || studentId === user.id);
    const isTeacherAddingStudent = ['TEACHER', 'ADMIN'].includes(user.role) && studentId;

    if (!isStudentJoiningThemselves && !isTeacherAddingStudent) {
      return json({ error: 'Students can only join themselves. Teachers must specify a studentId.' }, { status: 403 });
    }

    const targetStudentId = isStudentJoiningThemselves ? user.id : studentId;

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

    // Access check: teacher/admin or student enrolled in the class
    if (isTeacherAddingStudent && group.class.teacherId !== user.id && user.role !== 'ADMIN') {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if student is enrolled in the class
    const enrollment = await prisma.classStudent.findFirst({
      where: {
        classId: group.classId,
        studentId: targetStudentId
      }
    });

    if (!enrollment) {
      return json({ error: 'Student is not enrolled in this class' }, { status: 400 });
    }

    // Check if already a member
    const existingMember = await prisma.groupMember.findFirst({
      where: {
        groupId,
        studentId: targetStudentId
      }
    });

    if (existingMember) {
      return json({ error: 'Student is already a member of this group' }, { status: 400 });
    }

    // Check if student already joined another group in the same lesson
    if (isStudentJoiningThemselves && group.lessonId) {
      const lessonGroups = await prisma.group.findMany({
        where: {
          classId: group.classId,
          lessonId: group.lessonId,
          isActive: true
        },
        select: { id: true }
      });
      const lessonGroupIds = lessonGroups.map((g: { id: string }) => g.id);

      const existingLessonMembership = await prisma.groupMember.findFirst({
        where: {
          studentId: targetStudentId,
          groupId: { in: lessonGroupIds }
        }
      });

      if (existingLessonMembership) {
        return json({ error: 'You have already joined a group in this lesson' }, { status: 400 });
      }
    }

    // Add member
    const member = await prisma.groupMember.create({
      data: {
        groupId,
        studentId: targetStudentId,
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
    return apiError(error);
  }
};

// DELETE - Remove member from group
export const DELETE: RequestHandler = async ({ request, params, url }: { request: any; params: any; url: any }) => {
  try {
    const user = getAuthUser(request);
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
    return apiError(error);
  }
};

