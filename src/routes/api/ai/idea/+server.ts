import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';
import { createHistory } from '$lib/history.js';
import {
  checkAIRequestLimit,
  getRemainingAIRequests,
  checkReadingTextAIRequestLimit,
  getRemainingReadingTextAIRequests,
  generateReadingAssistantResponse,
  getReadingTextAILimit,
  getGlobalAILimit,
} from '$lib/ai.js';

export const POST: RequestHandler = async ({ request }: { request: any }) => {
  let question = '';
  try {
    const user = getAuthUser(request);

    const body = await request.json();
    const classId = body?.classId;
    const readingTextId = body?.readingTextId;
    const annotationId = body?.annotationId;
    question = body?.question || '';

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

    const perReadingTextLimit = getReadingTextAILimit();
    const globalLimit = getGlobalAILimit();

    // Enforce per-readingText AI limit
    if (!checkReadingTextAIRequestLimit(user.id, readingTextId)) {
      const remainingForReadingText = getRemainingReadingTextAIRequests(
        user.id,
        readingTextId,
      );

      // Build ChatGPT redirect URL so the user can continue there
      const chatgptUrl = `https://chatgpt.com/?q=${encodeURIComponent(String(question))}`;

      return json(
        {
          error:
            `You have reached the AI assistance limit for this reading text (${perReadingTextLimit} times).`,
          remainingForReadingText,
          perReadingTextLimit,
          chatgptUrl,
        },
        { status: 429 },
      );
    }

    // Also respect global AI limit if enabled
    if (!checkAIRequestLimit(user.id)) {
      const remaining = getRemainingAIRequests(user.id);
      const chatgptUrl = `https://chatgpt.com/?q=${encodeURIComponent(String(question))}`;
      return json(
        {
          error: 'AI request limit exceeded',
          remaining,
          limit: globalLimit,
          chatgptUrl,
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
      perReadingTextLimit,
      limit: globalLimit,
    });
  } catch (error: any) {
    console.error('IDEA AI chat error:', error?.message || error);

    // If OpenAI fails (quota, key issue, network), redirect user to ChatGPT web
    const chatgptUrl = `https://chatgpt.com/?q=${encodeURIComponent(String(question || ''))}`;
    return json(
      {
        error: 'AI service unavailable — redirecting to ChatGPT',
        chatgptUrl,
      },
      { status: 503 },
    );
  }
};

