import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { verifyToken, isProfileComplete } from '$lib/auth.js';
import { prisma } from '$lib/database.js';

export const GET: RequestHandler = async ({ cookies }) => {
  try {
    const token = cookies.get('auth_token');

    if (!token) {
      return json(
        { error: 'No token found' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    
    if (!decoded) {
      return json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get full user data
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
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

    if (!user || !user.isActive) {
      return json(
        { error: 'User not found or inactive' },
        { status: 401 }
      );
    }

    const profileComplete = isProfileComplete(user);

    return json({
      user,
      token,
      profileComplete,
    });
  } catch (error) {
    console.error('Auth sync error:', error);
    return json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

