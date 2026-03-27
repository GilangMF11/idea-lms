import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { verifyToken } from '$lib/auth.js';
import { logger } from '$lib/logger.js';

function isAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const user = verifyToken(token);
  return user?.role === 'ADMIN' ? user : null;
}

// GET: Fetch Available vs Enrolled students for plotting UI
export const GET: RequestHandler = async ({ request, params }) => {
  try {
    const user = isAdmin(request);
    if (!user) return json({ error: 'Forbidden' }, { status: 403 });

    const classId = params.id;
    if (!classId) return json({ error: 'Class ID is required' }, { status: 400 });

    // Fetch enrolled students mapping
    const enrolledMappings = await prisma.classStudent.findMany({
      where: { classId },
      include: {
        student: {
          select: { id: true, username: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    const enrolledStudents = enrolledMappings.map(m => m.student);
    const enrolledIds = enrolledStudents.map(s => s.id);

    // Fetch available students who are NOT in the class
    const availableStudents = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        isActive: true,
        id: { notIn: enrolledIds }, // Exclude those already here
      },
      select: { id: true, username: true, firstName: true, lastName: true, email: true }
    });

    return json({ enrolledStudents, availableStudents });
  } catch (error) {
    logger.error(`Error fetching plotting data for class ${params.id}`, undefined, error as Error);
    return json({ error: 'Internal server error while fetching student data' }, { status: 500 });
  }
};

// POST: Execute the mass synchronization Plot array
export const POST: RequestHandler = async ({ request, params }) => {
  try {
    const user = isAdmin(request);
    if (!user) return json({ error: 'Forbidden' }, { status: 403 });

    const classId = params.id;
    if (!classId) return json({ error: 'Class ID is required' }, { status: 400 });

    const body = await request.json();
    const newStudentIds: string[] = body.studentIds || [];

    // Verify class exists
    const classToSync = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, name: true }
    });

    if (!classToSync) {
      return json({ error: 'Target class does not exist' }, { status: 404 });
    }

    // Grab current mappings for diffing
    const existingMappings = await prisma.classStudent.findMany({
      where: { classId }
    });

    const existingIds = existingMappings.map(m => m.studentId);

    // Differentiate lists
    const studentIdsToDisconnect = existingIds.filter(id => !newStudentIds.includes(id));
    const studentIdsToConnect = newStudentIds.filter(id => !existingIds.includes(id));

    // Execute atomic transaction to guarantee DB integrity if something happens halfway
    await prisma.$transaction(async (tx) => {
      // 1. Delete removed students
      if (studentIdsToDisconnect.length > 0) {
        await tx.classStudent.deleteMany({
          where: {
            classId,
            studentId: { in: studentIdsToDisconnect }
          }
        });
      }

      // 2. Connect new students
      if (studentIdsToConnect.length > 0) {
        const connectData = studentIdsToConnect.map(studentId => ({
          classId,
          studentId
        }));
        await tx.classStudent.createMany({
          data: connectData
        });
      }
      
      // 3. Update 'updatedAt' flag loosely on the Class to indicate changes
      await tx.class.update({
        where: { id: classId },
        data: { updatedAt: new Date() }
      });
    });

    logger.info(`Admin ${user.id} plotted ${newStudentIds.length} students into class ${classToSync.name} (Added: ${studentIdsToConnect.length}, Removed: ${studentIdsToDisconnect.length})`);

    return json({ 
      message: 'Class student plotting synchronized successfully',
      added: studentIdsToConnect.length,
      removed: studentIdsToDisconnect.length
    });
  } catch (error) {
    logger.error('Error synchronizing students plot array', undefined, error as Error);
    return json({ error: 'Internal server error during synchronization' }, { status: 500 });
  }
};
