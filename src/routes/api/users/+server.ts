import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { verifyToken } from '$lib/auth.js';
import { createHistory } from '$lib/history.js';

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

    const userId = url.searchParams.get('id');
    const classId = url.searchParams.get('classId');
    const role = url.searchParams.get('role');
    const search = url.searchParams.get('search');
    const isActiveParam = url.searchParams.get('isActive');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (userId) {
      // Get specific user
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          avatar: true,
          phoneNumber: true,
          institution: true,
          program: true,
          semester: true,
          province: true,
          city: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!targetUser) {
        return json({ error: 'User not found' }, { status: 404 });
      }

      // Check if user has access to view this user
      if (user.id !== userId && user.role !== 'ADMIN') {
        // Check if they're in the same class
        if (classId) {
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
            return json({ error: 'Access denied' }, { status: 403 });
          }
        } else {
          return json({ error: 'Access denied' }, { status: 403 });
        }
      }

      return json({ user: targetUser });
    }

    // Get users list - ADMIN can view all users, TEACHER can view students only
    if (user.role !== 'ADMIN' && user.role !== 'TEACHER') {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    // TEACHER can only view students
    let effectiveRole = role;
    if (user.role === 'TEACHER') {
      if (role && role !== 'STUDENT') {
        return json({ error: 'Teachers can only view students' }, { status: 403 });
      }
      // Force role to STUDENT for teachers
      effectiveRole = 'STUDENT';
    }

    const whereClause: any = {};
    if (effectiveRole) {
      whereClause.role = effectiveRole;
    }
    if (isActiveParam !== null && isActiveParam !== '') {
      whereClause.isActive = isActiveParam === 'true';
    }
    if (classId) {
      whereClause.OR = [
        { classesAsStudent: { some: { classId } } },
        { classesAsTeacher: { some: { id: classId } } },
      ];
    }
    if (search) {
      const searchConditions = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
      
      if (whereClause.OR) {
        // If classId filter exists, combine with AND
        whereClause.AND = [
          { OR: whereClause.OR },
          { OR: searchConditions }
        ];
        delete whereClause.OR;
      } else {
        whereClause.OR = searchConditions;
      }
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        avatar: true,
        phoneNumber: true,
        institution: true,
        program: true,
        semester: true,
        province: true,
        city: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    const total = await prisma.user.count({
      where: whereClause,
    });

    return json({ users, total, limit, offset });
  } catch (error) {
    console.error('Get users error:', error);
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
    if (!user || !['TEACHER', 'ADMIN'].includes(user.role)) {
      return json({ error: 'Only teachers and admins can create users' }, { status: 403 });
    }

    const { email, username, firstName, lastName, password, role = 'STUDENT' } = await request.json();

    if (!email || !username || !firstName || !lastName || !password) {
      return json({ error: 'All fields are required' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() }
        ]
      }
    });

    if (existingUser) {
      return json({ error: 'User with this email or username already exists' }, { status: 400 });
    }

    // Create new user
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        firstName,
        lastName,
        password: hashedPassword,
        role: role as 'STUDENT' | 'TEACHER' | 'ADMIN',
        isActive: true
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const PATCH: RequestHandler = async ({ request, url }) => {
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

    const userId = url.searchParams.get('id');
    if (!userId) {
      return json({ error: 'User ID is required' }, { status: 400 });
    }

    const { 
      firstName, 
      lastName, 
      avatar, 
      isActive, 
      role,
      phoneNumber,
      institution,
      program,
      semester,
      province,
      city
    } = await request.json();

    // Check if user has access to update this user
    if (user.id !== userId && user.role !== 'ADMIN') {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return json({ error: 'User not found' }, { status: 404 });
    }

    // Only admins can change role and isActive
    if (role && user.role !== 'ADMIN') {
      return json({ error: 'Only administrators can change user role' }, { status: 403 });
    }

    if (isActive !== undefined && user.role !== 'ADMIN') {
      return json({ error: 'Only administrators can change user status' }, { status: 403 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(avatar !== undefined && { avatar }),
        ...(isActive !== undefined && { isActive }),
        ...(role && { role }),
        ...(phoneNumber !== undefined && { phoneNumber }),
        ...(institution !== undefined && { institution }),
        ...(program !== undefined && { program }),
        ...(semester !== undefined && { semester: semester ? parseInt(semester.toString()) : null }),
        ...(province !== undefined && { province }),
        ...(city !== undefined && { city }),
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        avatar: true,
        phoneNumber: true,
        institution: true,
        program: true,
        semester: true,
        province: true,
        city: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Create history record
    await createHistory({
      tableName: 'users',
      recordId: userId,
      action: 'UPDATE',
      oldData: targetUser,
      newData: updatedUser,
      userId: user.id,
    });

    return json({ user: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ request, url }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (!user || user.role !== 'ADMIN') {
      return json({ error: 'Only administrators can delete users' }, { status: 403 });
    }

    const userId = url.searchParams.get('id');
    if (!userId) {
      return json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent self-deletion
    if (user.id === userId) {
      return json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Soft delete by setting isActive to false
    const deletedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    // Create history record
    await createHistory({
      tableName: 'users',
      recordId: userId,
      action: 'DELETE',
      oldData: targetUser,
      newData: deletedUser,
      userId: user.id,
    });

    return json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

