import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { authenticateWithGoogle, generateToken } from '$lib/auth.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return json(
        { error: 'ID token is required' },
        { status: 400 }
      );
    }

    // Authenticate user with Google token
    const user = await authenticateWithGoogle(idToken);
    
    if (!user) {
      return json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateToken(user);

    return json({
      user,
      token,
    });
  } catch (error) {
    console.error('Google token authentication error:', error);
    return json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

