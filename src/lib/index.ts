// Export all utilities and services
export { prisma } from './database.js';
export { 
  hashPassword, 
  verifyPassword, 
  generateToken, 
  verifyToken, 
  authenticateUser, 
  createUser,
  type AuthUser 
} from './auth.js';
export { 
  createHistory, 
  getHistoryByRecord, 
  getHistoryByClass 
} from './history.js';
export { 
  generateAIFeedback, 
  checkAIRequestLimit, 
  getRemainingAIRequests 
} from './ai.js';
export { 
  fileUploadService, 
  validateImageFile, 
  validateDocumentFile, 
  validateAvatarFile 
} from './file-upload.js';
export { 
  notificationService 
} from './notifications.js';
export { 
  searchService 
} from './search.js';
export { 
  analyticsService 
} from './analytics.js';
export { 
  exportService 
} from './export.js';
export { 
  backupService 
} from './backup.js';
export { 
  monitoringService 
} from './monitoring.js';
export { 
  rateLimiter 
} from './rate-limiter.js';
export { 
  emailService 
} from './email.js';
export { 
  logger, 
  createLogger 
} from './logger.js';
export { 
  config 
} from './config.js';
export { 
  validateEmail, 
  validatePassword, 
  validateUsername, 
  validateClassCode, 
  validateTextContent, 
  validateAnnotationPosition, 
  validateRating, 
  validateRequiredFields, 
  sanitizeText, 
  validatePaginationParams 
} from './validation.js';
export { 
  AppError, 
  ValidationError, 
  AuthenticationError, 
  AuthorizationError, 
  NotFoundError, 
  ConflictError, 
  RateLimitError, 
  DatabaseError, 
  AIError, 
  handleError, 
  isOperationalError 
} from './errors.js';
export { 
  authenticateUser as authMiddleware, 
  requireRole, 
  requireTeacher, 
  requireAdmin, 
  requireStudentOrTeacher 
} from './middleware.js';
export { 
  USER_ROLES, 
  EXERCISE_TYPES, 
  REVIEW_TYPES, 
  REVISION_STATUS, 
  HISTORY_ACTIONS, 
  PAGINATION, 
  AI_LIMITS, 
  VALIDATION, 
  ANNOTATION_COLORS, 
  ERROR_MESSAGES, 
  SUCCESS_MESSAGES 
} from './constants.js';
export { 
  generateId, 
  generateClassCode, 
  formatDate, 
  formatDateTime, 
  parsePaginationParams, 
  calculatePagination, 
  sanitizeHtml, 
  truncateText, 
  extractTextFromHtml, 
  generateSlug, 
  isValidUrl, 
  formatFileSize, 
  debounce, 
  throttle, 
  groupBy, 
  sortBy, 
  unique, 
  chunk 
} from './utils.js';
export { 
  createTestUser, 
  createTestClass, 
  createTestReadingText, 
  createTestWritingDraft, 
  createTestAnnotation, 
  createTestPeerReview, 
  createTestRevision, 
  createTestExercise, 
  createTestExerciseSubmission, 
  createTestChatMessage, 
  createTestWritingOutline, 
  createTestFinalProduct, 
  cleanupTestData, 
  seedTestData 
} from './test-utils.js';