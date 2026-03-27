import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { prisma } from '$lib/database.js';

export const load: PageServerLoad = async ({ url }: { url: URL }) => {
  const token = url.searchParams.get('token');

  if (!token) {
    return {
      success: false,
      message: 'Invalid or missing verification token.'
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { verificationToken: token } as any, // Type assertion for Prisma
    });

    if (!user) {
      return {
        success: false,
        message: 'Invalid verification token.'
      };
    }

    if ((user as any).isEmailVerified) {
      return {
        success: true,
        message: 'Email is already verified. You can now log in.'
      };
    }

    const expiryInfo = (user as any).verificationTokenExpiry;
    if (expiryInfo && new Date(expiryInfo) < new Date()) {
      return {
        success: false,
        message: 'Verification token has expired. Please register again or request a new link.'
      };
    }

    // Verify the user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      } as any,
    });

    return {
      success: true,
      message: 'Email verified successfully! You can now log in.'
    };
  } catch (error) {
    console.error('Error verifying email:', error);
    return {
      success: false,
      message: 'An error occurred during verification. Please try again later.'
    };
  }
};
