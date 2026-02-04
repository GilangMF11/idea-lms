import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { verifyToken } from '$lib/auth.js';
import { createHistory } from '$lib/history.js';
import {
  checkAIRequestLimit,
  getRemainingAIRequests,
  checkReadingTextAIRequestLimit,
  getRemainingReadingTextAIRequests,
  generateReadingAssistantResponse,
} from '$lib/ai.js';

export const POST: RequestHandler = async ({ request }: { request: any }) => {
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

    const body = await request.json();
    const { question, classId, readingTextId, annotationId } = body ?? {};

    if (!question || !String(question).trim()) {
      return json({ error: 'Question is required' }, { status: 400 });
    }
    if (!classId) {
      return json({ error: 'Class ID is required' }, { status: 400 });
    }
    if (!readingTextId) {
      return json({ error: 'Reading text ID is required' }, { status: 400 });
    }

    // Check class access
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

    // Ensure the reading text belongs to the class
    const readingText = await prisma.readingText.findFirst({
      where: {
        id: readingTextId,
        classId,
      },
    });

    if (!readingText) {
      return json(
        { error: 'Reading text not found or access denied' },
        { status: 404 },
      );
    }

    let annotation: any | null = null;
    if (annotationId) {
      annotation = await prisma.annotation.findFirst({
        where: {
          id: annotationId,
          classId,
          readingTextId,
        },
      });

      if (!annotation) {
        return json(
          { error: 'Annotation not found or access denied' },
          { status: 404 },
        );
      }
    }

    // Enforce per-readingText AI limit (3 per readingText per user per day)
    if (!checkReadingTextAIRequestLimit(user.id, readingTextId)) {
      const remainingForReadingText = getRemainingReadingTextAIRequests(
        user.id,
        readingTextId,
      );

      return json(
        {
          error:
            'You have reached the AI assistance limit for this reading text (3 times).',
          remainingForReadingText,
          perReadingTextLimit: 3,
        },
        { status: 429 },
      );
    }

    // Also respect global AI limit if enabled
    if (!checkAIRequestLimit(user.id)) {
      const remaining = getRemainingAIRequests(user.id);
      return json(
        {
          error: 'AI request limit exceeded',
          remaining,
          limit: 5,
        },
        { status: 429 },
      );
    }

    // Generate AI response using reading text + optional highlighted text
    const answer = await generateReadingAssistantResponse({
      question: String(question),
      readingTextContent: readingText.content,
      selectedText: annotation?.selectedText ?? undefined,
    });

    // Simpan jawaban AI sebagai ChatMessage di discus
    const aiChatMessage = await prisma.chatMessage.create({
      data: {
        classId,
        userId: user.id, // Disimpan sebagai pesan di thread siswa ini
        content: answer,
        type: 'TEXT',
        annotationId: annotationId ?? null,
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

    // Catat di history agar konsisten dengan pesan chat lain
    await createHistory({
      tableName: 'chat_messages',
      recordId: aiChatMessage.id,
      action: 'CREATE',
      newData: aiChatMessage,
      userId: user.id,
      classId,
    });

    const remainingGlobal = getRemainingAIRequests(user.id);
    const remainingForReadingText = getRemainingReadingTextAIRequests(
      user.id,
      readingTextId,
    );

    return json({
      answer,
      message: aiChatMessage,
      remaining: remainingGlobal,
      readingTextRemaining: remainingForReadingText,
      perReadingTextLimit: 3,
      limit: 5,
    });
  } catch (error) {
    console.error('IDEA AI chat error:', error);
    return json({ error: 'Failed to generate AI response' }, { status: 500 });
  }
};

