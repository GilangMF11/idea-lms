import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { createUser, generateToken } from '$lib/auth.js';
import { prisma } from '$lib/database.js';
import { generateVerificationToken, sendVerificationEmail } from '$lib/server/email.js';

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
        { error: 'All fields are required' },
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
        { error: 'A user with this email or username already exists' },
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

    // Generate Verification Token
    const vToken = generateVerificationToken();
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24); // Token valid for 24 hours

    // Update user with verification token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: vToken,
        verificationTokenExpiry: expiry,
      } as any,
    });

    // Send the email
    await sendVerificationEmail(email, vToken, firstName);

    // Return success message without the login token
    return json({
      message: 'Registration successful. Please check your email to verify your account.',
      requireVerification: true,
      user
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
