const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const AI_REQUEST_LIMIT = 5; // Daily AI requests per user (global)
const READING_TEXT_AI_REQUEST_LIMIT = 3; // Per-readingText AI requests per user

interface AIRequest {
  userId: string;
  timestamp: number;
  count: number;
}

// Global per-user request counts (per day)
const userRequestCounts = new Map<string, AIRequest>();

// Per-readingText request counts (per day), keyed by `${userId}:${readingTextId}`
const readingTextRequestCounts = new Map<string, AIRequest>();

export async function generateAIFeedback(content: string, type: 'review' | 'suggestion' = 'review'): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = type === 'review' 
    ? `Please provide constructive feedback on this writing content: ${content}`
    : `Please provide suggestions for improving this writing content: ${content}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful writing assistant that provides constructive feedback and suggestions for improving writing quality.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Unable to generate feedback at this time.';
  } catch (error) {
    console.error('AI feedback generation failed:', error);
    throw new Error('Failed to generate AI feedback');
  }
}

export function checkAIRequestLimit(userId: string): boolean {
  const now = Date.now();
  const userRequest = userRequestCounts.get(userId);

  if (!userRequest) {
    userRequestCounts.set(userId, {
      userId,
      timestamp: now,
      count: 1,
    });
    return true;
  }

  // Reset count if it's a new day
  const dayInMs = 24 * 60 * 60 * 1000;
  if (now - userRequest.timestamp > dayInMs) {
    userRequestCounts.set(userId, {
      userId,
      timestamp: now,
      count: 1,
    });
    return true;
  }

  // Check if user has exceeded limit
  if (userRequest.count >= AI_REQUEST_LIMIT) {
    return false;
  }

  // Increment count
  userRequest.count++;
  userRequestCounts.set(userId, userRequest);
  return true;
}

export function getRemainingAIRequests(userId: string): number {
  const userRequest = userRequestCounts.get(userId);
  if (!userRequest) {
    return AI_REQUEST_LIMIT;
  }

  const now = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;
  
  // Reset if it's a new day
  if (now - userRequest.timestamp > dayInMs) {
    return AI_REQUEST_LIMIT;
  }

  return Math.max(0, AI_REQUEST_LIMIT - userRequest.count);
}

/**
 * Check and increment per-readingText AI request usage for a user.
 * Returns true if the request is allowed, false if the limit is exceeded.
 */
export function checkReadingTextAIRequestLimit(userId: string, readingTextId: string): boolean {
  const key = `${userId}:${readingTextId}`;
  const now = Date.now();
  const existing = readingTextRequestCounts.get(key);

  // First request for this readingText today
  if (!existing) {
    readingTextRequestCounts.set(key, {
      userId,
      timestamp: now,
      count: 1,
    });
    return true;
  }

  const dayInMs = 24 * 60 * 60 * 1000;

  // New day: reset counter
  if (now - existing.timestamp > dayInMs) {
    readingTextRequestCounts.set(key, {
      userId,
      timestamp: now,
      count: 1,
    });
    return true;
  }

  // Already reached per-readingText limit
  if (existing.count >= READING_TEXT_AI_REQUEST_LIMIT) {
    return false;
  }

  // Increment usage
  existing.count++;
  readingTextRequestCounts.set(key, existing);
  return true;
}

/**
 * Get remaining per-readingText AI requests for a user.
 */
export function getRemainingReadingTextAIRequests(userId: string, readingTextId: string): number {
  const key = `${userId}:${readingTextId}`;
  const existing = readingTextRequestCounts.get(key);

  if (!existing) {
    return READING_TEXT_AI_REQUEST_LIMIT;
  }

  const now = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;

  // New day: reset (full remaining)
  if (now - existing.timestamp > dayInMs) {
    return READING_TEXT_AI_REQUEST_LIMIT;
  }

  return Math.max(0, READING_TEXT_AI_REQUEST_LIMIT - existing.count);
}

/**
 * Generate an AI response for reading-text discussions ("IDEA AI" assistant).
 * This is more conversational than the generic writing feedback helper.
 */
export async function generateReadingAssistantResponse(params: {
  question: string;
  readingTextContent?: string;
  selectedText?: string;
}): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const { question, readingTextContent, selectedText } = params;

  const contextParts: string[] = [];
  if (readingTextContent) {
    contextParts.push(
      'Reading text content (may be truncated):\n' +
        readingTextContent.slice(0, 3000)
    );
  }
  if (selectedText) {
    contextParts.push(`Highlighted passage:\n"${selectedText}"`);
  }

  const contextBlock = contextParts.length
    ? `\n\nContext for this question:\n${contextParts.join('\n\n')}`
    : '';

  const userPrompt =
    `You are IDEA AI, a friendly reading assistant that helps students understand a text, ` +
    `ask critical questions, and make connections. Answer clearly and concisely, at the student's level.\n\n` +
    `Student question:\n${question}` +
    contextBlock;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are IDEA AI, a helpful reading-comprehension assistant for university students. ' +
              'You explain concepts, ask follow-up questions, and always stay on-topic with the provided text.',
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return (
      data.choices?.[0]?.message?.content ||
      'IDEA AI cannot generate a response right now.'
    );
  } catch (error) {
    console.error('Reading assistant AI generation failed:', error);
    throw new Error('Failed to generate AI response');
  }
}
