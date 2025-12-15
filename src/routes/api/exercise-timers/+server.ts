import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/database';
import { verifyToken } from '$lib/auth';

export const GET: RequestHandler = async ({ url, cookies }) => {
  try {
    const token = cookies.get('token');
    if (!token) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const exerciseId = url.searchParams.get('exerciseId');
    if (!exerciseId) {
      return json({ error: 'Exercise ID is required' }, { status: 400 });
    }

    const timer = await prisma.exerciseTimer.findUnique({
      where: {
        exerciseId_userId: {
          exerciseId,
          userId: user.id
        }
      }
    });

    if (!timer) {
      return json({ timer: null });
    }

    // Check if timer is finished based on current time
    const now = Date.now();
    const endTimestamp = Number(timer.endTimestamp);
    const isFinished = endTimestamp <= now || timer.isFinished;
    const remainingSeconds = isFinished ? 0 : Math.max(0, Math.ceil((endTimestamp - now) / 1000));

    return json({
      timer: {
        ...timer,
        endTimestamp: endTimestamp,
        remainingSeconds,
        isFinished
      }
    });
  } catch (error) {
    console.error('Error fetching exercise timer:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const token = cookies.get('token');
    if (!token) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { exerciseId, durationSeconds, remainingSeconds, endTimestamp, isPaused, isFinished } = await request.json();

    if (!exerciseId || durationSeconds === undefined || remainingSeconds === undefined || !endTimestamp) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    const timer = await prisma.exerciseTimer.upsert({
      where: {
        exerciseId_userId: {
          exerciseId,
          userId: user.id
        }
      },
      update: {
        remainingSeconds,
        endTimestamp: BigInt(endTimestamp),
        isPaused: isPaused ?? false,
        isFinished: isFinished ?? false,
        updatedAt: new Date()
      },
      create: {
        exerciseId,
        userId: user.id,
        durationSeconds,
        remainingSeconds,
        endTimestamp: BigInt(endTimestamp),
        isPaused: isPaused ?? false,
        isFinished: isFinished ?? false
      }
    });

    return json({
      timer: {
        ...timer,
        endTimestamp: Number(timer.endTimestamp)
      }
    });
  } catch (error) {
    console.error('Error saving exercise timer:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ url, cookies }) => {
  try {
    const token = cookies.get('token');
    if (!token) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const exerciseId = url.searchParams.get('exerciseId');
    if (!exerciseId) {
      return json({ error: 'Exercise ID is required' }, { status: 400 });
    }

    await prisma.exerciseTimer.deleteMany({
      where: {
        exerciseId,
        userId: user.id
      }
    });

    return json({ success: true });
  } catch (error) {
    console.error('Error deleting exercise timer:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

