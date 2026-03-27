import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { verifyToken } from '$lib/auth.js';
import { createHistory } from '$lib/history.js';

export const DELETE: RequestHandler = async ({ request, params }) => {
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

    // Authorization check
    if (user.role === 'STUDENT') {
      return json({ error: 'Access denied' }, { status: 403 });
    } else if (user.role === 'TEACHER' && classData.teacherId !== user.id) {
      return json({ error: 'Access denied' }, { status: 403 });
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

    return json({ success: true, message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Delete class error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
