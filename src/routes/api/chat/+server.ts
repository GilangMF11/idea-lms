import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { verifyToken } from '$lib/auth.js';
import { createHistory } from '$lib/history.js';

export const GET: RequestHandler = async ({ request, url }: { request: any; url: any }) => {
  try {
    console.log('GET /api/chat - Starting request');
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('GET /api/chat - No auth header');
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    console.log('GET /api/chat - Token:', token.substring(0, 20) + '...');
    
    const user = verifyToken(token);
    if (!user) {
      console.log('GET /api/chat - Invalid token');
      return json({ error: 'Invalid token' }, { status: 401 });
    }

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
    console.error('Get chat messages error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
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

    const { classId, content, annotationId } = await request.json();

    if (!classId || !content) {
      return json({ error: 'Class ID and content are required' }, { status: 400 });
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
        content,
        ...(annotationId && { annotationId }), // Include annotationId if provided
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
    console.error('Create chat message error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
