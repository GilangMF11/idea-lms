import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { verifyToken } from '$lib/auth.js';

export const PUT: RequestHandler = async ({ request }: { request: any }) => {
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

    const { firstName, lastName, phoneNumber, institution, program, semester, province, city } = await request.json();

    // Validation
    if (!firstName || !lastName || !phoneNumber || !institution || !program || !semester || !province || !city) {
      return json(
        { error: 'Semua field wajib diisi' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName,
        lastName,
        phoneNumber,
        institution,
        program,
        semester: parseInt(semester.toString()),
        province,
        city,
      },
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
        avatar: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return json({ user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

