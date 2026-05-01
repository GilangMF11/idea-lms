import { json } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import type { RequestHandler } from '@sveltejs/kit';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';

export const GET: RequestHandler = async ({ request, url }: { request: any; url: any }) => {
  try {
    const user = getAuthUser(request);

    // Only TEACHER and ADMIN can export
    if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
      return json({ error: 'Access denied. Only teachers and admins can export.' }, { status: 403 });
    }

    const classId = url.searchParams.get('classId');
    if (!classId) {
      return json({ error: 'Class ID is required' }, { status: 400 });
    }

    // Verify access to this class
    let classAccess = null;
    if (user.role === 'ADMIN') {
      classAccess = await prisma.class.findUnique({ where: { id: classId } });
    } else {
      classAccess = await prisma.class.findFirst({
        where: { id: classId, teacherId: user.id },
      });
    }
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
        userId: { in: students.map(s => s.studentId) },
        annotationId: { not: null },
      },
      _count: { id: true },
    });

    // Build stats map
    const statsMap = new Map<string, Record<string, number>>();
    for (const student of students) {
      statsMap.set(student.studentId, {
        ASKING_QUESTION: 0,
        ANSWERING_QUESTION: 0,
        GIVING_NEW_IDEA: 0,
        DISPUTING_IDEAS: 0,
      });
    }
    for (const stat of chatStats) {
      const userStats = statsMap.get(stat.userId);
      if (userStats && stat.chatType) {
        userStats[stat.chatType] = stat._count.id;
      }
    }

    // Get detailed messages for each student
    const allMessages = await prisma.chatMessage.findMany({
      where: {
        classId,
        userId: { in: students.map(s => s.studentId) },
        annotationId: { not: null },
      },
      select: {
        id: true,
        userId: true,
        content: true,
        chatType: true,
        type: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Build CSV
    const chatTypes = ['ASKING_QUESTION', 'ANSWERING_QUESTION', 'GIVING_NEW_IDEA', 'DISPUTING_IDEAS'];
    const className = (classAccess as any).name || 'Class';

    let csv = '';
    csv += `Class: ${className}\n`;
    csv += `Exported At: ${new Date().toLocaleString()}\n`;
    csv += `Total Students: ${students.length}\n`;
    csv += `Total Messages: ${allMessages.length}\n\n`;

    // Summary table
    csv += '=== HEAT MAP SUMMARY ===\n';
    csv += 'No,Name,Username,Asking Question,Answering Question,Giving New Idea,Disputing Ideas,Total\n';

    const sorted = students.map(student => {
      const stats = statsMap.get(student.studentId) || { ASKING_QUESTION: 0, ANSWERING_QUESTION: 0, GIVING_NEW_IDEA: 0, DISPUTING_IDEAS: 0 };
      const total = Object.values(stats).reduce((a, b) => a + b, 0);
      return { student, stats, total };
    }).sort((a, b) => b.total - a.total);

    sorted.forEach((item, i) => {
      const s = item.student.student;
      csv += `${i + 1},"${s.firstName} ${s.lastName}",${s.username},${item.stats.ASKING_QUESTION},${item.stats.ANSWERING_QUESTION},${item.stats.GIVING_NEW_IDEA},${item.stats.DISPUTING_IDEAS},${item.total}\n`;
    });

    // Totals row
    const totals = chatTypes.reduce((acc, ct) => {
      acc[ct] = sorted.reduce((sum, item) => sum + item.stats[ct], 0);
      return acc;
    }, {} as Record<string, number>);
    csv += `,,,${totals.ASKING_QUESTION},${totals.ANSWERING_QUESTION},${totals.GIVING_NEW_IDEA},${totals.DISPUTING_IDEAS},${allMessages.length}\n`;

    csv += '\n=== DETAILED MESSAGES ===\n';
    csv += 'No,Name,Username,Chat Type,Message Type,Content,Timestamp\n';

    allMessages.forEach((msg, i) => {
      const student = students.find(s => s.studentId === msg.userId)?.student;
      const name = student ? `${student.firstName} ${student.lastName}` : 'Unknown';
      const username = student?.username || 'unknown';
      const content = (msg.content || '').replace(/"/g, '""');
      csv += `${i + 1},"${name}",${username},${msg.chatType || 'N/A'},${msg.type},"${content}",${new Date(msg.createdAt).toLocaleString()}\n`;
    });

    // Return CSV as downloadable response
    const filename = `heat-map-${className.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return apiError(error);
  }
};
