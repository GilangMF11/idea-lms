import type { Handle } from '@sveltejs/kit';
import { initBackgroundJobs } from '$lib/cron.js';

// Initialize scheduled cron jobs as the server boots up
initBackgroundJobs();

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  
  // SECURITY: Add protective headers to all responses
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');

  return response;
};
