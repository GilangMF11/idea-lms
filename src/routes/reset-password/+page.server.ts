import type { PageServerLoad } from './$types.js';
import { prisma } from '$lib/database.js';

export const load: PageServerLoad = async ({ url }: { url: URL }) => {
  const token = url.searchParams.get('token');

  if (!token) {
    return {
      valid: false,
      message: 'Missing password reset token in URL.',
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { resetPasswordToken: token } as any, // Type assertion for Prisma
    });

    if (!user) {
      return {
        valid: false,
        message: 'Invalid password reset token.',
      };
    }

    const expiryInfo = (user as any).resetPasswordExpires;
    if (!expiryInfo || new Date(expiryInfo) < new Date()) {
      return {
        valid: false,
        message: 'Password reset token has expired. Please request a new one.',
      };
    }

    return {
      valid: true,
      token,
      email: user.email,
    };
  } catch (error) {
    console.error('Error validating password reset token:', error);
    return {
      valid: false,
      message: 'An error occurred while validating your reset link. Please try again later.',
    };
  }
};
