import { verifyToken } from './auth.js';
import { AuthenticationError, AuthorizationError } from './errors.js';
import type { AuthUser } from './auth.js';

export function authenticateUser(authHeader: string | null): AuthUser {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthenticationError('Invalid authorization header');
  }

  const token = authHeader.substring(7);
  const user = verifyToken(token);
  
  if (!user) {
    throw new AuthenticationError('Invalid or expired token');
  }

  return user;
}

export function requireRole(user: AuthUser, allowedRoles: string[]): void {
  if (!allowedRoles.includes(user.role)) {
    throw new AuthorizationError('Insufficient permissions');
  }
}

export function requireTeacher(user: AuthUser): void {
  requireRole(user, ['TEACHER', 'ADMIN']);
}

export function requireAdmin(user: AuthUser): void {
  requireRole(user, ['ADMIN']);
}

export function requireStudentOrTeacher(user: AuthUser): void {
  requireRole(user, ['STUDENT', 'TEACHER', 'ADMIN']);
}
