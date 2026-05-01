import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { getAuthUser, requireTeacher, apiError } from '$lib/api-utils.js';

export const GET: RequestHandler = async ({ request, url }) => {
  try {
    const user = getAuthUser(request);

    const classId = url.searchParams.get('classId');

    if (!classId) {
      return json({ error: 'Class ID is required' }, { status: 400 });
    }

    // Check access
    if (user.role === 'STUDENT') {
      const enrollment = await prisma.classStudent.findFirst({
        where: { classId, studentId: user.id }
      });
      if (!enrollment) {
        return json({ error: 'Access denied' }, { status: 403 });
      }
    } else if (user.role === 'TEACHER') {
      const classData = await prisma.class.findUnique({ where: { id: classId } });
      if (!classData || classData.teacherId !== user.id) {
        return json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const lessons = await prisma.lesson.findMany({
      where: { classId },
      include: {
        _count: {
          select: {
            readingTexts: true,
            exercises: true,
            groups: true
          }
        }
      },
      orderBy: { order: 'asc' }
    });

    return json({ lessons });
  } catch (error) {
    return apiError(error);
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const user = getAuthUser(request);
    requireTeacher(user);

    const { title, description, classId, order, scheduledAt, isActive } = await request.json();

    if (!title || !classId) {
      return json({ error: 'Title and Class ID are required' }, { status: 400 });
    }

    // Check access
    if (user.role === 'TEACHER') {
      const classData = await prisma.class.findUnique({ where: { id: classId } });
      if (!classData || classData.teacherId !== user.id) {
        return json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Get the next order if not provided
    let lessonOrder = order;
    if (lessonOrder === undefined || lessonOrder === null) {
      const maxOrder = await prisma.lesson.findFirst({
        where: { classId },
        orderBy: { order: 'desc' },
        select: { order: true }
      });
      lessonOrder = (maxOrder?.order ?? -1) + 1;
    }

    const lesson = await prisma.lesson.create({
      data: {
        title,
        description: description || null,
        classId,
        order: lessonOrder,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        isActive: isActive !== undefined ? isActive : true
      },
      include: {
        _count: {
          select: {
            readingTexts: true,
            exercises: true,
            groups: true
          }
        }
      }
    });

    return json({ lesson }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
};

export const PUT: RequestHandler = async ({ request }) => {
  try {
    const user = getAuthUser(request);
    requireTeacher(user);

    const { id, title, description, order, scheduledAt, isActive } = await request.json();

    if (!id) {
      return json({ error: 'Lesson ID is required' }, { status: 400 });
    }

    const existingLesson = await prisma.lesson.findUnique({
      where: { id },
      include: { class: true }
    });

    if (!existingLesson) {
      return json({ error: 'Lesson not found' }, { status: 404 });
    }

    if (user.role === 'TEACHER' && existingLesson.class.teacherId !== user.id) {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    const lesson = await prisma.lesson.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existingLesson.title,
        description: description !== undefined ? description : existingLesson.description,
        order: order !== undefined ? order : existingLesson.order,
        scheduledAt: scheduledAt !== undefined ? (scheduledAt ? new Date(scheduledAt) : null) : existingLesson.scheduledAt,
        isActive: isActive !== undefined ? isActive : existingLesson.isActive
      },
      include: {
        _count: {
          select: {
            readingTexts: true,
            exercises: true,
            groups: true
          }
        }
      }
    });

    return json({ lesson });
  } catch (error) {
    return apiError(error);
  }
};

export const DELETE: RequestHandler = async ({ request, url }) => {
  try {
    const user = getAuthUser(request);
    requireTeacher(user);

    const id = url.searchParams.get('id');

    if (!id) {
      return json({ error: 'Lesson ID is required' }, { status: 400 });
    }

    const existingLesson = await prisma.lesson.findUnique({
      where: { id },
      include: { class: true }
    });

    if (!existingLesson) {
      return json({ error: 'Lesson not found' }, { status: 404 });
    }

    if (user.role === 'TEACHER' && existingLesson.class.teacherId !== user.id) {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    await prisma.lesson.delete({ where: { id } });

    return json({ success: true });
  } catch (error) {
    return apiError(error);
  }
};
