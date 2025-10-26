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
    console.error('Get class students error:', error);
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

    // Check if student exists
    const student = await prisma.user.findUnique({
      where: { id: studentId, role: 'STUDENT' }
    });

    if (!student) {
      return json({ error: 'Student not found' }, { status: 404 });
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
    console.error('Add student to class error:', error);
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
    console.error('Remove student from class error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};