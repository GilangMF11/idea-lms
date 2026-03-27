import type { Handle } from '@sveltejs/kit';
import { initBackgroundJobs } from '$lib/cron.js';

// Initialize scheduled cron jobs as the server boots up
initBackgroundJobs();

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  return response;
};
