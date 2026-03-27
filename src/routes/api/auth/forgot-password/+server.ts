import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { generateVerificationToken, sendPasswordResetEmail } from '$lib/server/email.js';

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

    // If no user is found, DO NOT leak information. 
    // Always return a generic success message.
    if (!user) {
      return json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Optional: If user has no password (e.g. they strictly use Google OAuth), 
    // you might still want to let them set one, but usually it's better to prevent it 
    // or just send the link anyway. For now, we will allow them to set a password 
    // if they want to login via email in the future.

    // Generate reset token and expiration (1 hour)
    const resetToken = generateVerificationToken();
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1);

    // Save token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: expiry,
      } as any,
    });

    // Send the email
    await sendPasswordResetEmail(user.email, resetToken, user.firstName);

    return json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
