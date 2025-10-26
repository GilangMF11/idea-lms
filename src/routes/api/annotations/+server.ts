import { json } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import jwt from 'jsonwebtoken';
import type { RequestHandler } from '@sveltejs/kit';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function verifyToken(request: any) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded;
  } catch (error) {
    return null;
  }
}

// GET - Get annotations for a reading text
export const GET: RequestHandler = async ({ request, url }: { request: any; url: any }) => {
  try {
    const user = await verifyToken(request);
    if (!user) {
      return json({ error: 'Invalid token' }, { status: 401 });
    }

    const readingTextId = url.searchParams.get('readingTextId');
    
    if (!readingTextId) {
      return json({ error: 'Reading text ID is required' }, { status: 400 });
    }

    const annotations = await prisma.annotation.findMany({
      where: {
        readingTextId: readingTextId
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            username: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return json({ annotations });
  } catch (error) {
    console.error('Error fetching annotations:', error);
    return json({ error: 'Failed to fetch annotations' }, { status: 500 });
  }
};

// POST - Create new annotation
export const POST: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const user = await verifyToken(request);
    if (!user) {
      return json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { readingTextId, classId, content, startPos, endPos, color } = body;

    if (!readingTextId || !classId || !content || startPos === undefined || endPos === undefined) {
      return json({ error: 'Reading text ID, class ID, content, start position, and end position are required' }, { status: 400 });
    }

    // Verify reading text exists
    const readingText = await prisma.readingText.findUnique({
      where: { id: readingTextId }
    });

    if (!readingText) {
      return json({ error: 'Reading text not found' }, { status: 404 });
    }

    const newAnnotation = await prisma.annotation.create({
      data: {
        readingTextId,
        userId: user.id,
        classId,
        content,
        startPos,
        endPos,
        color: color || null
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            username: true
          }
        }
      }
    });

    return json({ annotation: newAnnotation }, { status: 201 });
  } catch (error) {
    console.error('Error creating annotation:', error);
    return json({ error: 'Failed to create annotation' }, { status: 500 });
  }
};

// PUT - Update annotation
export const PUT: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const user = await verifyToken(request);
    if (!user) {
      return json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { id, content } = body;

    if (!id || !content) {
      return json({ error: 'Annotation ID and content are required' }, { status: 400 });
    }

    // Check if annotation exists and user owns it
    const existingAnnotation = await prisma.annotation.findUnique({
      where: { id }
    });

    if (!existingAnnotation) {
      return json({ error: 'Annotation not found' }, { status: 404 });
    }

    if (existingAnnotation.userId !== user.id) {
      return json({ error: 'You can only edit your own annotations' }, { status: 403 });
    }

    const updatedAnnotation = await prisma.annotation.update({
      where: { id },
      data: { content },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            username: true
          }
        }
      }
    });

    return json({ annotation: updatedAnnotation });
  } catch (error) {
    console.error('Error updating annotation:', error);
    return json({ error: 'Failed to update annotation' }, { status: 500 });
  }
};

// DELETE - Delete annotation
export const DELETE: RequestHandler = async ({ request, url }: { request: any; url: any }) => {
  try {
    const user = await verifyToken(request);
    if (!user) {
      return json({ error: 'Invalid token' }, { status: 401 });
    }

    const id = url.searchParams.get('id');
    
    if (!id) {
      return json({ error: 'Annotation ID is required' }, { status: 400 });
    }

    // Check if annotation exists and user owns it
    const existingAnnotation = await prisma.annotation.findUnique({
      where: { id }
    });

    if (!existingAnnotation) {
      return json({ error: 'Annotation not found' }, { status: 404 });
    }

    if (existingAnnotation.userId !== user.id) {
      return json({ error: 'You can only delete your own annotations' }, { status: 403 });
    }

    await prisma.annotation.delete({
      where: { id }
    });

    return json({ message: 'Annotation deleted successfully' });
  } catch (error) {
    console.error('Error deleting annotation:', error);
    return json({ error: 'Failed to delete annotation' }, { status: 500 });
  }
};