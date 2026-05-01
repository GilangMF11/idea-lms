import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { authenticateUser, generateToken } from '$lib/auth.js';
import { rateLimiter } from '$lib/rate-limiter.js';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  try {
    // SECURITY: Rate limit login attempts by IP
    const clientIP = getClientAddress();
    const rateCheck = rateLimiter.checkLoginLimit(clientIP);
    if (!rateCheck.allowed) {
      return json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const { email, password, rememberMe } = await request.json();

    if (!email || !password) {
      return json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // SECURITY: Input length validation to prevent DoS
    if (email.length > 255 || password.length > 128) {
      return json(
        { error: 'Invalid input length' },
        { status: 400 }
      );
    }

    const user = await authenticateUser(email, password);
    const token = generateToken(user!, { rememberMe: !!rememberMe });

    return json({
      user,
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error.message);
    
    // Email not verified gets a specific message so UI can show resend button
    if (error.message === 'EMAIL_NOT_VERIFIED') {
      return json(
        { error: 'Please check your email and verify your account before logging in.' },
        { status: 403 }
      );
    }

    // SECURITY: Return generic message for all other auth failures
    // to prevent user enumeration attacks
    const authErrors = [
      'User account not found.',
      'Your account is currently inactive.',
      'Please log in using your Google account.',
      'Incorrect password. Please try again.'
    ];

    if (authErrors.includes(error.message)) {
      return json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    return json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
