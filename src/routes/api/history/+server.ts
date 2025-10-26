import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { verifyToken } from '$lib/auth.js';
import { getHistoryByClass, getHistoryByRecord } from '$lib/history.js';

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
    const tableName = url.searchParams.get('tableName');
    const recordId = url.searchParams.get('recordId');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    if (classId) {
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

      const history = await getHistoryByClass(classId, limit);
      return json({ history });
    }

    if (tableName && recordId) {
      // Check if user has access to this record
      let hasAccess = false;

      if (tableName === 'classes') {
        const classRecord = await prisma.class.findFirst({
          where: {
            id: recordId,
            OR: [
              { teacherId: user.id },
              { students: { some: { studentId: user.id } } },
            ],
          },
        });
        hasAccess = !!classRecord;
      } else if (tableName === 'reading_texts') {
        const readingText = await prisma.readingText.findFirst({
          where: {
            id: recordId,
            class: {
              OR: [
                { teacherId: user.id },
                { students: { some: { studentId: user.id } } },
              ],
            },
          },
        });
        hasAccess = !!readingText;
      } else if (tableName === 'writing_drafts') {
        const draft = await prisma.writingDraft.findFirst({
          where: {
            id: recordId,
            class: {
              OR: [
                { teacherId: user.id },
                { students: { some: { studentId: user.id } } },
              ],
            },
          },
        });
        hasAccess = !!draft;
      }

      if (!hasAccess) {
        return json({ error: 'Access denied to this record' }, { status: 403 });
      }

      const history = await getHistoryByRecord(tableName, recordId);
      return json({ history });
    }

    return json({ error: 'Class ID or table name and record ID are required' }, { status: 400 });
  } catch (error) {
    console.error('Get history error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
