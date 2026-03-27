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

// Admin Class Creation
export const POST: RequestHandler = async ({ request }) => {
  try {
    const user = isAdmin(request);
    if (!user) return json({ error: 'Forbidden. Only administrators can use this endpoint.' }, { status: 403 });

    const { name, description, teacherId } = await request.json();

    if (!name || !teacherId) {
      return json({ error: 'Class name and teacherId are required' }, { status: 400 });
    }

    // Ensure the assigned teacher actually exists and has the TEACHER role
    const teacherValidate = await prisma.user.findUnique({
      where: { id: teacherId }
    });

    if (!teacherValidate || teacherValidate.role !== 'TEACHER') {
      return json({ error: 'Invalid teacher ID or assigned user is not a teacher' }, { status: 400 });
    }

    // Generate unique class code
    const code = `CLS${Date.now().toString().slice(-6)}`;

    const newClass = await prisma.class.create({
      data: {
        name,
        description,
        code,
        teacherId,
        isActive: true,
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
      recordId: newClass.id,
      action: 'CREATE',
      newData: newClass,
      userId: user.id, // Admin created it
      classId: newClass.id,
    });

    logger.info(`Admin ${user.id} created new class '${newClass.name}' assigned to teacher ${teacherId}`);

    return json({ class: newClass }, { status: 201 });
  } catch (error) {
    logger.error('Admin class creation failed', undefined, error as Error);
    return json({ error: 'Internal server error while creating class' }, { status: 500 });
  }
};
