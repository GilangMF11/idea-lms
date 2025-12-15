import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { verifyToken } from '$lib/auth.js';

// GET - Get specific group
export const GET: RequestHandler = async ({ request, params }: { request: any; params: any }) => {
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

    const groupId = params.id;
    if (!groupId) {
      return json({ error: 'Group ID is required' }, { status: 400 });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            teacherId: true
          }
        },
        members: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                username: true
              }
            }
          }
        },
        readingTexts: {
          select: {
            id: true,
            title: true,
            content: true,
            author: true,
            source: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            members: true,
            readingTexts: true
          }
        }
      }
    });

    if (!group) {
      return json({ error: 'Group not found' }, { status: 404 });
    }

    // Check access
    if (group.class.teacherId !== user.id && user.role !== 'ADMIN') {
      if (user.role === 'STUDENT') {
        const isMember = group.members.some(m => m.studentId === user.id);
        if (!isMember) {
          return json({ error: 'Access denied' }, { status: 403 });
        }
      } else {
        return json({ error: 'Access denied' }, { status: 403 });
      }
    }

    return json({ group });
  } catch (error) {
    console.error('Get group error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

// PATCH - Update group
export const PATCH: RequestHandler = async ({ request, params }: { request: any; params: any }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (!user || !['TEACHER', 'ADMIN'].includes(user.role)) {
      return json({ error: 'Only teachers and admins can update groups' }, { status: 403 });
    }

    const groupId = params.id;
    const { name, description, isActive } = await request.json();

    // Get group to check access
    const existingGroup = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        class: {
          select: {
            teacherId: true
          }
        }
      }
    });

    if (!existingGroup) {
      return json({ error: 'Group not found' }, { status: 404 });
    }

    if (existingGroup.class.teacherId !== user.id && user.role !== 'ADMIN') {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    const group = await prisma.group.update({
      where: { id: groupId },
      data: updateData,
      include: {
        members: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                username: true
              }
            }
          }
        },
        _count: {
          select: {
            members: true,
            readingTexts: true
          }
        }
      }
    });

    return json({ group });
  } catch (error) {
    console.error('Update group error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

// DELETE - Delete group (soft delete)
export const DELETE: RequestHandler = async ({ request, params }: { request: any; params: any }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (!user || !['TEACHER', 'ADMIN'].includes(user.role)) {
      return json({ error: 'Only teachers and admins can delete groups' }, { status: 403 });
    }

    const groupId = params.id;

    // Get group to check access
    const existingGroup = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        class: {
          select: {
            teacherId: true
          }
        }
      }
    });

    if (!existingGroup) {
      return json({ error: 'Group not found' }, { status: 404 });
    }

    if (existingGroup.class.teacherId !== user.id && user.role !== 'ADMIN') {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    // Soft delete
    await prisma.group.update({
      where: { id: groupId },
      data: { isActive: false }
    });

    return json({ success: true });
  } catch (error) {
    console.error('Delete group error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

