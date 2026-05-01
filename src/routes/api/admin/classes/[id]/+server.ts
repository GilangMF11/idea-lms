import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { verifyToken } from '$lib/auth.js';
import { createHistory } from '$lib/history.js';
import { logger } from '$lib/logger.js';

function isAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const user = verifyToken(token);
  return user?.role === 'ADMIN' ? user : null;
}

// Get single class details (for admin edit modal)
export const GET: RequestHandler = async ({ request, params }) => {
  try {
    const user = isAdmin(request);
    if (!user) return json({ error: 'Forbidden. Only administrators can use this endpoint.' }, { status: 403 });

    const classId = params.id;
    if (!classId) {
      return json({ error: 'Class ID is required' }, { status: 400 });
    }

    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        teacher: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: { students: true }
        }
      },
    });

    if (!classData) {
      return json({ error: 'Class not found' }, { status: 404 });
    }

    return json({ class: classData });
  } catch (error) {
    logger.error('Admin get class failed', undefined, error as Error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

// Update class (Admin only)
export const PUT: RequestHandler = async ({ request, params }) => {
  try {
    const user = isAdmin(request);
    if (!user) return json({ error: 'Forbidden. Only administrators can use this endpoint.' }, { status: 403 });

    const classId = params.id;
    if (!classId) {
      return json({ error: 'Class ID is required' }, { status: 400 });
    }

    const { name, description, teacherId } = await request.json();

    if (!name || !teacherId) {
      return json({ error: 'Class name and teacherId are required' }, { status: 400 });
    }

    // Check if class exists
    const existingClass = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!existingClass) {
      return json({ error: 'Class not found' }, { status: 404 });
    }

    // Ensure the assigned teacher actually exists and has the TEACHER role
    const teacherValidate = await prisma.user.findUnique({
      where: { id: teacherId }
    });

    if (!teacherValidate || teacherValidate.role !== 'TEACHER') {
      return json({ error: 'Invalid teacher ID or assigned user is not a teacher' }, { status: 400 });
    }

    // Update class
    const updatedClass = await prisma.class.update({
      where: { id: classId },
      data: {
        name,
        description,
        teacherId,
      },
      include: {
        teacher: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: { students: true }
        }
      },
    });

    // Create history record
    await createHistory({
      tableName: 'classes',
      recordId: updatedClass.id,
      action: 'UPDATE',
      oldData: existingClass,
      newData: updatedClass,
      userId: user.id,
      classId: updatedClass.id,
    });

    logger.info(`Admin ${user.id} updated class '${updatedClass.name}'`);

    return json({ class: updatedClass });
  } catch (error) {
    logger.error('Admin class update failed', undefined, error as Error);
    return json({ error: 'Internal server error while updating class' }, { status: 500 });
  }
};

// Delete class (Admin only - soft delete)
export const DELETE: RequestHandler = async ({ request, params }) => {
  try {
    const user = isAdmin(request);
    if (!user) return json({ error: 'Forbidden. Only administrators can use this endpoint.' }, { status: 403 });

    const classId = params.id;
    if (!classId) {
      return json({ error: 'Class ID is required' }, { status: 400 });
    }

    const classData = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classData) {
      return json({ error: 'Class not found' }, { status: 404 });
    }

    // Perform soft delete
    const deletedClass = await prisma.class.update({
      where: { id: classId },
      data: { isActive: false },
    });

    // Create history record
    await createHistory({
      tableName: 'classes',
      recordId: deletedClass.id,
      action: 'DELETE',
      oldData: classData,
      newData: deletedClass,
      userId: user.id,
      classId: deletedClass.id,
    });

    logger.info(`Admin ${user.id} deleted class '${deletedClass.name}'`);

    return json({ success: true, message: 'Class deleted successfully' });
  } catch (error) {
    logger.error('Admin class deletion failed', undefined, error as Error);
    return json({ error: 'Internal server error while deleting class' }, { status: 500 });
  }
};
