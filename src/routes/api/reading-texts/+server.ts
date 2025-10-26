import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { verifyToken } from '$lib/auth.js';

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
    const id = url.searchParams.get('id');
    
    let readingTexts;
    
    if (id) {
      // Get single reading text
      const readingText = await prisma.readingText.findUnique({
        where: { id },
        include: {
          class: {
            include: {
              teacher: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          }
        }
      });

      if (!readingText) {
        return json({ error: 'Reading text not found' }, { status: 404 });
      }

      // Check access permissions
      if (user.role === 'STUDENT') {
        // Check if student is enrolled in the class
        const enrollment = await prisma.classStudent.findFirst({
          where: {
            classId: readingText.classId,
            studentId: user.id
          }
        });

        if (!enrollment) {
          return json({ error: 'Access denied' }, { status: 403 });
        }
      } else if (user.role === 'TEACHER') {
        // Check if teacher owns the class
        if (readingText.class.teacherId !== user.id) {
          return json({ error: 'Access denied' }, { status: 403 });
        }
      }

      return json({ readingText });
    } else if (classId) {
      // Get reading texts for specific class
      if (user.role === 'STUDENT') {
        // Check if student is enrolled in the class
        const enrollment = await prisma.classStudent.findFirst({
          where: {
            classId,
            studentId: user.id
          }
        });

        if (!enrollment) {
          return json({ error: 'Access denied' }, { status: 403 });
        }
      } else if (user.role === 'TEACHER') {
        // Check if teacher owns the class
        const classData = await prisma.class.findUnique({
          where: { id: classId }
        });

        if (!classData || classData.teacherId !== user.id) {
          return json({ error: 'Access denied' }, { status: 403 });
        }
      }

      readingTexts = await prisma.readingText.findMany({
        where: { classId },
        include: {
          class: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              annotations: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } else {
      // Get all reading texts based on user role
      if (user.role === 'STUDENT') {
        // Get reading texts from classes where student is enrolled
        const studentClasses = await prisma.classStudent.findMany({
          where: { studentId: user.id },
          select: { classId: true }
        });

        const classIds = studentClasses.map(sc => sc.classId);

        readingTexts = await prisma.readingText.findMany({
          where: {
            classId: { in: classIds }
          },
          include: {
            class: {
              select: {
                id: true,
                name: true
              }
            },
            _count: {
              select: {
                annotations: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      } else if (user.role === 'TEACHER') {
        // Get reading texts from classes where user is teacher
        readingTexts = await prisma.readingText.findMany({
          where: {
            class: {
              teacherId: user.id
            }
          },
          include: {
            class: {
              select: {
                id: true,
                name: true
              }
            },
            _count: {
              select: {
                annotations: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      } else {
        // Admin can see all reading texts
        readingTexts = await prisma.readingText.findMany({
          include: {
            class: {
              select: {
                id: true,
                name: true
              }
            },
            _count: {
              select: {
                annotations: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      }
    }

    return json({ readingTexts });
  } catch (error) {
    console.error('Get reading texts error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (!user || user.role !== 'TEACHER') {
      return json({ error: 'Only teachers can create reading texts' }, { status: 403 });
    }

    const { title, content, author, source, classId, isActive = true } = await request.json();

    if (!title || !content || !classId) {
      return json({ error: 'Title, content, and Class ID are required' }, { status: 400 });
    }

    // Check if class exists and user is the teacher
    const classData = await prisma.class.findUnique({
      where: { id: classId }
    });

    if (!classData) {
      return json({ error: 'Class not found' }, { status: 404 });
    }

    if (classData.teacherId !== user.id) {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    // Create reading text
    const readingText = await prisma.readingText.create({
      data: {
        title,
        content,
        author: author || null,
        source: source || null,
        classId,
        isActive
      },
      include: {
        class: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return json({ readingText }, { status: 201 });
  } catch (error) {
    console.error('Create reading text error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (!user || user.role !== 'TEACHER') {
      return json({ error: 'Only teachers can update reading texts' }, { status: 403 });
    }

    const { id, title, content, author, source, isActive } = await request.json();

    if (!id) {
      return json({ error: 'Reading text ID is required' }, { status: 400 });
    }

    // Check if reading text exists and user is the teacher
    const existingReadingText = await prisma.readingText.findUnique({
      where: { id },
      include: {
        class: true
      }
    });

    if (!existingReadingText) {
      return json({ error: 'Reading text not found' }, { status: 404 });
    }

    if (existingReadingText.class.teacherId !== user.id) {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    // Update reading text
    const readingText = await prisma.readingText.update({
      where: { id },
      data: {
        title: title || existingReadingText.title,
        content: content || existingReadingText.content,
        author: author !== undefined ? author : existingReadingText.author,
        source: source !== undefined ? source : existingReadingText.source,
        isActive: isActive !== undefined ? isActive : existingReadingText.isActive
      },
      include: {
        class: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return json({ readingText });
  } catch (error) {
    console.error('Update reading text error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ request, url }: { request: any; url: any }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (!user || user.role !== 'TEACHER') {
      return json({ error: 'Only teachers can delete reading texts' }, { status: 403 });
    }

    const id = url.searchParams.get('id');

    if (!id) {
      return json({ error: 'Reading text ID is required' }, { status: 400 });
    }

    // Check if reading text exists and user is the teacher
    const existingReadingText = await prisma.readingText.findUnique({
      where: { id },
      include: {
        class: true
      }
    });

    if (!existingReadingText) {
      return json({ error: 'Reading text not found' }, { status: 404 });
    }

    if (existingReadingText.class.teacherId !== user.id) {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete reading text
    await prisma.readingText.delete({
      where: { id }
    });

    return json({ success: true });
  } catch (error) {
    console.error('Delete reading text error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};