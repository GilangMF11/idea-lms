export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters long' };
  }
  return { isValid: true };
}

export function validateUsername(username: string): { isValid: boolean; message?: string } {
  if (username.length < 3) {
    return { isValid: false, message: 'Username must be at least 3 characters long' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { isValid: false, message: 'Username can only contain letters, numbers, and underscores' };
  }
  return { isValid: true };
}

export function validateClassCode(code: string): { isValid: boolean; message?: string } {
  if (code.length < 3) {
    return { isValid: false, message: 'Class code must be at least 3 characters long' };
  }
  if (!/^[A-Z0-9]+$/.test(code)) {
    return { isValid: false, message: 'Class code can only contain uppercase letters and numbers' };
  }
  return { isValid: true };
}

export function validateTextContent(content: string): { isValid: boolean; message?: string } {
  if (content.trim().length === 0) {
    return { isValid: false, message: 'Content cannot be empty' };
  }
  if (content.length > 100000) {
    return { isValid: false, message: 'Content is too long (max 100,000 characters)' };
  }
  return { isValid: true };
}

export function validateAnnotationPosition(
  startPos: number,
  endPos: number,
  contentLength: number
): { isValid: boolean; message?: string } {
  if (startPos < 0 || endPos < 0) {
    return { isValid: false, message: 'Position cannot be negative' };
  }
  if (startPos >= endPos) {
    return { isValid: false, message: 'Start position must be less than end position' };
  }
  if (endPos > contentLength) {
    return { isValid: false, message: 'End position exceeds content length' };
  }
  return { isValid: true };
}

export function validateRating(rating: number): { isValid: boolean; message?: string } {
  if (rating < 1 || rating > 5) {
    return { isValid: false, message: 'Rating must be between 1 and 5' };
  }
  if (!Number.isInteger(rating)) {
    return { isValid: false, message: 'Rating must be a whole number' };
  }
  return { isValid: true };
}

export function validateRequiredFields(
  data: Record<string, any>,
  requiredFields: string[]
): { isValid: boolean; message?: string } {
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      return { isValid: false, message: `${field} is required` };
    }
  }
  return { isValid: true };
}

export function sanitizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

export function validatePaginationParams(
  page: number,
  limit: number
): { isValid: boolean; message?: string } {
  if (page < 1) {
    return { isValid: false, message: 'Page must be greater than 0' };
  }
  if (limit < 1 || limit > 100) {
    return { isValid: false, message: 'Limit must be between 1 and 100' };
  }
  return { isValid: true };
}
