import { json } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import type { RequestHandler } from '@sveltejs/kit';
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
    const classAccess = await prisma.class.findFirst({
      where: {
        id: classId,
        OR: [
          { teacherId: user.id },
          { students: { some: { studentId: user.id } } },
        ],
      },
    });

    if (!classAccess) {
      return json({ error: 'Access denied to this class' }, { status: 403 });
    }

    // Get all students in the class
    const students = await prisma.classStudent.findMany({
      where: { classId },
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

    // Get chat messages grouped by user and chat type
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
    console.error('Error fetching chat statistics:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
