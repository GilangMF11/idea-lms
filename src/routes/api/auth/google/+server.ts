import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getGoogleAuthUrl } from '$lib/auth.js';

export const GET: RequestHandler = async () => {
  const authUrl = getGoogleAuthUrl();
  throw redirect(302, authUrl);
};

