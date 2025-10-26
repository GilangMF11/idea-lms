export const USER_ROLES = {
  STUDENT: 'STUDENT',
  TEACHER: 'TEACHER',
  ADMIN: 'ADMIN',
} as const;

export const EXERCISE_TYPES = {
  INDIVIDUAL: 'INDIVIDUAL',
  GROUP: 'GROUP',
} as const;

export const REVIEW_TYPES = {
  PERSUASIVE: 'PERSUASIVE',
  INTERACTIVE: 'INTERACTIVE',
} as const;

export const REVISION_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  FINISHED: 'FINISHED',
} as const;

export const HISTORY_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const AI_LIMITS = {
  DAILY_REQUESTS: 5,
  REQUEST_WINDOW_MS: 24 * 60 * 60 * 1000, // 24 hours
} as const;

export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 6,
  USERNAME_MIN_LENGTH: 3,
  CLASS_CODE_MIN_LENGTH: 3,
  CONTENT_MAX_LENGTH: 100000,
  RATING_MIN: 1,
  RATING_MAX: 5,
} as const;

export const ANNOTATION_COLORS = [
  '#FFE066', // Yellow
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Light Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
] as const;

export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access denied',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation failed',
  CONFLICT: 'Resource already exists',
  RATE_LIMIT: 'Rate limit exceeded',
  INTERNAL_ERROR: 'Internal server error',
  DATABASE_ERROR: 'Database operation failed',
  AI_ERROR: 'AI service error',
} as const;

export const SUCCESS_MESSAGES = {
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  REGISTRATION_SUCCESS: 'Registration successful',
} as const;
