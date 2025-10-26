const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const AI_REQUEST_LIMIT = 5; // Limiting AI requests per user

interface AIRequest {
  userId: string;
  timestamp: number;
  count: number;
}

const userRequestCounts = new Map<string, AIRequest>();

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
        model: 'gpt-3.5-turbo',
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
