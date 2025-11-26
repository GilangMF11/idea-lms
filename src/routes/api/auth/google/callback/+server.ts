import { redirect } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getGoogleToken, authenticateWithGoogle, generateToken, isProfileComplete } from '$lib/auth.js';
import { prisma } from '$lib/database.js';
import { config } from '$lib/config.js';

export const GET: RequestHandler = async ({ url, cookies }) => {
  try {
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      throw redirect(302, '/login?error=google_auth_failed');
    }

    if (!code) {
      throw redirect(302, '/login?error=no_code');
    }

    // Exchange code for token
    const idToken = await getGoogleToken(code);
    
    if (!idToken) {
      throw redirect(302, '/login?error=token_exchange_failed');
    }

    // Authenticate user with Google token
    const user = await authenticateWithGoogle(idToken);
    
    if (!user) {
      throw redirect(302, '/login?error=authentication_failed');
    }

    // Generate JWT token
    const token = generateToken(user);

    // Set cookie with token
    cookies.set('auth_token', token, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    // Check if profile is complete
    // Get user data and check profile completeness
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    // Type-safe check for profile completeness
    const profileComplete = fullUser ? isProfileComplete({
      phoneNumber: (fullUser as any).phoneNumber,
      institution: (fullUser as any).institution,
      program: (fullUser as any).program,
      semester: (fullUser as any).semester,
      province: (fullUser as any).province,
      city: (fullUser as any).city,
    }) : false;

    console.log('Profile complete check:', {
      userId: user.id,
      email: user.email,
      profileComplete,
      hasPhoneNumber: !!(fullUser as any)?.phoneNumber,
      hasInstitution: !!(fullUser as any)?.institution,
      hasProgram: !!(fullUser as any)?.program,
      hasSemester: !!(fullUser as any)?.semester,
      hasProvince: !!(fullUser as any)?.province,
      hasCity: !!(fullUser as any)?.city,
    });

    // Redirect to complete profile if not complete, otherwise to dashboard
    if (!profileComplete) {
      console.log('Redirecting to complete-profile');
      throw redirect(302, '/complete-profile?oauth_success=true');
    } else {
      console.log('Redirecting to dashboard');
      throw redirect(302, '/dashboard?oauth_success=true');
    }
  } catch (error) {
    // Redirect is not an error in SvelteKit, it's the way to redirect
    if (error instanceof Response || (error && typeof error === 'object' && 'status' in error && 'location' in error)) {
      throw error;
    }
    console.error('Google OAuth callback error:', error);
    throw redirect(302, '/login?error=internal_error');
  }
};

