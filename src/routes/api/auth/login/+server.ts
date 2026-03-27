import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { authenticateUser, generateToken } from '$lib/auth.js';

export const POST: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const { email, password, rememberMe } = await request.json();

    if (!email || !password) {
      return json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      return json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = generateToken(user, { rememberMe: !!rememberMe });

    return json({
      user,
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    if (error.message === 'EMAIL_NOT_VERIFIED') {
      return json(
        { error: 'Please check your email and verify your account before logging in.' },
        { status: 403 }
      );
    }
    return json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
