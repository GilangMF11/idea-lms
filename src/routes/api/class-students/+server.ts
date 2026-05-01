import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';

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
        teacher: true,
        students: {
          include: {
            student: true
          }
        }
      }
    });

    if (!classData) {
      return json({ error: 'Class not found' }, { status: 404 });
    }

    // Check access permissions
    if (user.role === 'STUDENT') {
      const hasAccess = classData.students.some(cs => cs.studentId === user.id);
      if (!hasAccess) {
        return json({ error: 'Access denied' }, { status: 403 });
      }
    } else if (user.role === 'TEACHER' && classData.teacherId !== user.id) {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    return json({ students: classData.students });
  } catch (error) {
    return apiError(error);
  }
};

export const POST: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const user = getAuthUser(request);
    if (!user || !['TEACHER', 'ADMIN'].includes(user.role)) {
      return json({ error: 'Only teachers and admins can add students to classes' }, { status: 403 });
    }

    const { classId, studentId } = await request.json();

    if (!classId || !studentId) {
      return json({ error: 'Class ID and Student ID are required' }, { status: 400 });
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

    // Check if student exists and is a student
    const student = await prisma.user.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      return json({ error: 'Student not found' }, { status: 404 });
    }

    if (student.role !== 'STUDENT') {
      return json({ error: 'User is not a student' }, { status: 400 });
    }

    // Check if student is already in the class
    const existingEnrollment = await prisma.classStudent.findFirst({
      where: {
        classId,
        studentId
      }
    });

    if (existingEnrollment) {
      return json({ error: 'Student is already enrolled in this class' }, { status: 400 });
    }

    // Add student to class
    const enrollment = await prisma.classStudent.create({
      data: {
        classId,
        studentId
      },
      include: {
        student: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    return json({ enrollment }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
};

export const DELETE: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const user = getAuthUser(request);
    if (!user || !['TEACHER', 'ADMIN'].includes(user.role)) {
      return json({ error: 'Only teachers and admins can remove students from classes' }, { status: 403 });
    }

    const { classId, studentId } = await request.json();

    if (!classId || !studentId) {
      return json({ error: 'Class ID and Student ID are required' }, { status: 400 });
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

    // Remove student from class
    await prisma.classStudent.deleteMany({
      where: {
        classId,
        studentId
      }
    });

    return json({ success: true });
  } catch (error) {
    return apiError(error);
  }
};