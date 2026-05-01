import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { hashPassword } from '$lib/auth.js';

export const POST: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return json(
        { error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // SECURITY: Enforce strong password policy
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
    
    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSymbol) {
      return json(
        { error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one symbol.' },
        { status: 400 }
      );
    }

    // Find user by reset token
    const user = await prisma.user.findUnique({
      where: { resetPasswordToken: token } as any, // Type assertion for Prisma
    });

    if (!user) {
      return json(
        { error: 'Invalid or expired password reset token' },
        { status: 400 }
      );
    }

    // Check expiration
    const expiryDate = (user as any).resetPasswordExpires;
    if (!expiryDate || new Date(expiryDate) < new Date()) {
      return json(
        { error: 'Password reset token has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update the user's password and clear the reset tokens
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword as any,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      } as any,
    });

    return json({
      success: true,
      message: 'Password has been reset successfully. You can now log in.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
