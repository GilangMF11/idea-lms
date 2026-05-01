import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';

export const PUT: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const user = getAuthUser(request);

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
    return apiError(error);
  }
};

