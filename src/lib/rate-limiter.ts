interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }

  private getKey(identifier: string, action: string): string {
    return `${identifier}:${action}`;
  }

  private isAllowed(
    key: string,
    limit: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired entry
      this.limits.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: now + windowMs,
      };
    }

    if (entry.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    // Increment count
    entry.count++;
    this.limits.set(key, entry);

    return {
      allowed: true,
      remaining: limit - entry.count,
      resetTime: entry.resetTime,
    };
  }

  checkLimit(
    identifier: string,
    action: string,
    limit: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const key = this.getKey(identifier, action);
    return this.isAllowed(key, limit, windowMs);
  }

  // AI request rate limiting
  checkAIRequestLimit(userId: string): { allowed: boolean; remaining: number; resetTime: number } {
    const limit = 5; // 5 requests per day
    const windowMs = 24 * 60 * 60 * 1000; // 24 hours
    return this.checkLimit(userId, 'ai_request', limit, windowMs);
  }

  // Login attempt rate limiting
  checkLoginLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
    const limit = 5; // 5 attempts per hour
    const windowMs = 60 * 60 * 1000; // 1 hour
    return this.checkLimit(ip, 'login', limit, windowMs);
  }

  // API request rate limiting
  checkAPIRequestLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const limit = 100; // 100 requests per minute
    const windowMs = 60 * 1000; // 1 minute
    return this.checkLimit(identifier, 'api_request', limit, windowMs);
  }

  // Chat message rate limiting
  checkChatLimit(userId: string): { allowed: boolean; remaining: number; resetTime: number } {
    const limit = 30; // 30 messages per minute
    const windowMs = 60 * 1000; // 1 minute
    return this.checkLimit(userId, 'chat', limit, windowMs);
  }

  // Annotation rate limiting
  checkAnnotationLimit(userId: string): { allowed: boolean; remaining: number; resetTime: number } {
    const limit = 50; // 50 annotations per hour
    const windowMs = 60 * 60 * 1000; // 1 hour
    return this.checkLimit(userId, 'annotation', limit, windowMs);
  }

  // Reset limit for testing
  resetLimit(identifier: string, action: string): void {
    const key = this.getKey(identifier, action);
    this.limits.delete(key);
  }

  // Get current status
  getStatus(identifier: string, action: string): { count: number; resetTime: number } | null {
    const key = this.getKey(identifier, action);
    const entry = this.limits.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now > entry.resetTime) {
      this.limits.delete(key);
      return null;
    }

    return {
      count: entry.count,
      resetTime: entry.resetTime,
    };
  }

  // Cleanup on shutdown
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.limits.clear();
  }
}

export const rateLimiter = new RateLimiter();

// Cleanup on process exit
process.on('SIGINT', () => {
  rateLimiter.destroy();
});

process.on('SIGTERM', () => {
  rateLimiter.destroy();
});
