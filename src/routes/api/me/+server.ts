import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { getAuthUser, apiError } from '$lib/api-utils.js';

export const GET: RequestHandler = async ({ request }) => {
  try {
    const user = getAuthUser(request);

    // Get full user data
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
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

    if (!fullUser) {
      return json({ error: 'User not found' }, { status: 404 });
    }

    return json({ user: fullUser });
  } catch (error) {
    return apiError(error);
  }
};

export const PATCH: RequestHandler = async ({ request }) => {
  try {
    const user = getAuthUser(request);

    const { firstName, lastName, avatar } = await request.json();

    if (!firstName && !lastName && avatar === undefined) {
      return json({ error: 'At least one field is required' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(avatar !== undefined && { avatar }),
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return json({ user: updatedUser });
  } catch (error) {
    return apiError(error);
  }
};
