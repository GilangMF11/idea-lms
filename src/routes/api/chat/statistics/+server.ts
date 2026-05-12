import { json } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import type { RequestHandler } from '@sveltejs/kit';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';

export const GET: RequestHandler = async ({ request, url }: { request: any; url: any }) => {
  try {
    const user = getAuthUser(request);

    const classId = url.searchParams.get('classId');

    if (!classId) {
      return json({ error: 'Class ID is required' }, { status: 400 });
    }

    // Check if user has access to this class
    // Admin can access all classes, Teacher can only access their own classes, Student can only access their enrolled classes
    let classAccess = null;

    if (user.role === 'ADMIN') {
      // Admin can access any class
      classAccess = await prisma.class.findUnique({
        where: { id: classId },
      });
    } else if (user.role === 'TEACHER') {
      // Teacher can only access their own classes
      classAccess = await prisma.class.findFirst({
        where: {
          id: classId,
          teacherId: user.id,
        },
      });
    } else if (user.role === 'STUDENT') {
      // Student can only access their enrolled classes
      classAccess = await prisma.class.findFirst({
        where: {
          id: classId,
          students: { some: { studentId: user.id } },
        },
      });
    }

    if (!classAccess) {
      return json({ error: 'Access denied to this class' }, { status: 403 });
    }

    // Get students in the class (Only self if STUDENT)
    const studentsWhere: any = { classId };
    if (user.role === 'STUDENT') {
      studentsWhere.studentId = user.id;
    }

    const students = await prisma.classStudent.findMany({
      where: studentsWhere,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
      },
    });

    // Get chat messages grouped by user and chat type (exclude emoji-only messages which have no chatType)
    const chatStats = await prisma.chatMessage.groupBy({
      by: ['userId', 'chatType'],
      where: {
        classId,
        userId: {
          in: students.map(s => s.studentId),
        },
        annotationId: {
          not: null, // Only include annotation discussions
        },
        chatType: {
          not: null, // Exclude emoji-only messages (they have no chatType)
        },
      },
      _count: {
        id: true,
      },
    });

    // Create a map of user ID to chat type counts
    const statsMap = new Map<string, Record<string, number>>();

    // Initialize stats for all students
    for (const student of students) {
      statsMap.set(student.studentId, {
        ASKING_QUESTION: 0,
        ANSWERING_QUESTION: 0,
        GIVING_NEW_IDEA: 0,
        DISPUTING_IDEAS: 0,
      });
    }

    // Populate stats from chat messages
    for (const stat of chatStats) {
      const userStats = statsMap.get(stat.userId);
      if (userStats && stat.chatType) {
        userStats[stat.chatType] = stat._count.id;
      }
    }

    // Convert to array with user info
    const result = students.map(student => ({
      user: student.student,
      stats: statsMap.get(student.studentId) || {
        ASKING_QUESTION: 0,
        ANSWERING_QUESTION: 0,
        GIVING_NEW_IDEA: 0,
        DISPUTING_IDEAS: 0,
      },
      total: Object.values(statsMap.get(student.studentId) || {}).reduce((a, b) => a + b, 0),
    }));

    // Sort by total messages descending
    result.sort((a, b) => b.total - a.total);

    return json({ statistics: result });
  } catch (error) {
    return apiError(error);
  }
};
