import { json } from '@sveltejs/kit';
import { verifyToken } from './auth.js';
import type { AuthUser } from './auth.js';

/**
 * Extract and verify the authenticated user from a request.
 * Throws a structured error if auth fails — catch it with `apiError()`.
 *
 * Usage:
 *   const user = getAuthUser(request);
 */
export function getAuthUser(request: Request): AuthUser {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw { status: 401, message: 'Unauthorized' };
  }

  const token = authHeader.substring(7);
  const user = verifyToken(token);
  if (!user) {
    throw { status: 401, message: 'Invalid token' };
  }

  return user;
}

/**
 * Require the user to have one of the specified roles.
 * Throws 403 if not authorized.
 */
export function requireRole(user: AuthUser, allowedRoles: string[]): void {
  if (!allowedRoles.includes(user.role)) {
    throw { status: 403, message: 'Insufficient permissions' };
  }
}

/** Shortcut: require TEACHER or ADMIN */
export function requireTeacher(user: AuthUser): void {
  requireRole(user, ['TEACHER', 'ADMIN']);
}

/** Shortcut: require ADMIN */
export function requireAdmin(user: AuthUser): void {
  requireRole(user, ['ADMIN']);
}

/**
 * Unified error handler for API routes.
 * Catches structured `{ status, message }` errors thrown by getAuthUser / requireRole,
 * and falls back to 500 for unexpected errors.
 *
 * Usage:
 *   catch (error) { return apiError(error); }
 */
export function apiError(error: unknown) {
  if (error && typeof error === 'object' && 'status' in error && 'message' in error) {
    const e = error as { status: number; message: string };
    return json({ error: e.message }, { status: e.status });
  }

  console.error('Unhandled API error:', error);
  return json({ error: 'Internal server error' }, { status: 500 });
}
