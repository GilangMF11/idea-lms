import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';
import { createHistory } from '$lib/history.js';

export const GET: RequestHandler = async ({ request, url }: { request: any; url: any }) => {
  try {
    console.log('GET /api/chat - Starting request');
    
    const user = getAuthUser(request);

    console.log('GET /api/chat - User:', user.id);

    const classId = url.searchParams.get('classId');
    const annotationId = url.searchParams.get('annotationId');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    console.log('GET /api/chat - Params:', { classId, annotationId, limit });

    if (!classId) {
      console.log('GET /api/chat - No classId');
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

    // If annotationId is provided, validate it exists and belongs to the class
    if (annotationId) {
      const annotation = await prisma.annotation.findFirst({
        where: {
          id: annotationId,
          classId: classId
        }
      });
      
      if (!annotation) {
        return json({ error: 'Annotation not found or access denied' }, { status: 404 });
      }
    }

    console.log('GET /api/chat - Querying messages');
    const messages = await prisma.chatMessage.findMany({
      where: {
        classId,
        ...(annotationId && { annotationId }), // Filter by annotationId if provided
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit,
    });
    
    console.log('GET /api/chat - Messages found:', messages.length);

    return json({ messages });
  } catch (error) {
    return apiError(error);
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const user = getAuthUser(request);

    const { classId, content, annotationId, type = 'TEXT', audioUrl, audioDuration, chatType = 'ASKING_QUESTION' } = await request.json();

    // Detect emoji-only messages — skip chatType and heat-map counting
    const isEmojiOnly = (str: string) => {
      if (!str) return false;
      // Remove all emoji/unicode symbols, whitespace, and zero-width joiners
      const stripped = str.replace(
        /[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u200D\s]/gu,
        '',
      );
      return stripped.length === 0 && str.trim().length > 0;
    };

    const emojiOnly = type === 'TEXT' && isEmojiOnly(content || '');

    if (!classId) {
      return json({ error: 'Class ID is required' }, { status: 400 });
    }

    if (type === 'TEXT' && (!content || !content.trim())) {
      return json({ error: 'Content is required for text messages' }, { status: 400 });
    }

    if (type === 'AUDIO' && !audioUrl) {
      return json({ error: 'Audio URL is required for audio messages' }, { status: 400 });
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

    // If annotationId is provided, validate it exists and belongs to the class
    if (annotationId) {
      const annotation = await prisma.annotation.findFirst({
        where: {
          id: annotationId,
          classId: classId
        }
      });
      
      if (!annotation) {
        return json({ error: 'Annotation not found or access denied' }, { status: 404 });
      }
    }

    const message = await prisma.chatMessage.create({
      data: {
        classId,
        userId: user.id,
        content: type === 'TEXT' ? content : null,
        type: type as 'TEXT' | 'AUDIO',
        audioUrl: type === 'AUDIO' ? audioUrl : null,
        audioDuration: type === 'AUDIO' ? audioDuration ?? null : null,
        ...(annotationId && { annotationId }), // Include annotationId if provided
        ...(emojiOnly ? {} : { chatType: chatType as 'ASKING_QUESTION' | 'ANSWERING_QUESTION' | 'GIVING_NEW_IDEA' | 'DISPUTING_IDEAS' }),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    // Create history record
    await createHistory({
      tableName: 'chat_messages',
      recordId: message.id,
      action: 'CREATE',
      newData: message,
      userId: user.id,
      classId,
    });

    return json({ message }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
};
