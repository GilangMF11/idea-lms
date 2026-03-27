import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { generateVerificationToken, sendVerificationEmail } from '$lib/server/email.js';

export const POST: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const { email } = await request.json();

    if (!email) {
      return json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if ((user as any).isEmailVerified) {
      return json(
        { error: 'Email is already verified' },
        { status: 400 }
      );
    }

    // Generate new reset token and expiration (24 hours)
    const verificationToken = generateVerificationToken();
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24);

    // Save token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpiry: expiry,
      } as any,
    });

    // Send the email
    await sendVerificationEmail(user.email, verificationToken);

    return json({
      success: true,
      message: 'Verification link resent successfully. Please check your email.',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
