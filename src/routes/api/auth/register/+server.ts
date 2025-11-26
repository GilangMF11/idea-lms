import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { createUser, generateToken } from '$lib/auth.js';
import { prisma } from '$lib/database.js';

export const POST: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const { 
      email, 
      username, 
      password, 
      firstName, 
      lastName, 
      role,
      phoneNumber,
      institution,
      program,
      semester,
      province,
      city
    } = await request.json();

    if (!email || !username || !password || !firstName || !lastName) {
      return json(
        { error: 'Semua field wajib diisi' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username },
        ],
      },
    });

    if (existingUser) {
      return json(
        { error: 'Pengguna dengan email atau username ini sudah ada' },
        { status: 409 }
      );
    }

    const user = await createUser({
      email,
      username,
      password,
      firstName,
      lastName,
      role: 'STUDENT', // Always set to STUDENT for new registrations
      phoneNumber,
      institution,
      program,
      semester: semester ? parseInt(semester.toString()) : undefined,
      province,
      city,
    });

    const token = generateToken(user);

    return json({
      user,
      token,
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
