import { prisma } from './database.js';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  checks: {
    database: HealthCheck;
    memory: HealthCheck;
    disk: HealthCheck;
    api: HealthCheck;
  };
  uptime: number;
  version: string;
}

export interface HealthCheck {
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  details?: Record<string, any>;
}

export interface SystemMetrics {
  memory: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  database: {
    connections: number;
    queryTime: number;
    errorRate: number;
  };
  api: {
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
  };
}

export class MonitoringService {
  private startTime: number;
  private requestCount: number = 0;
  private errorCount: number = 0;
  private responseTimes: number[] = [];

  constructor() {
    this.startTime = Date.now();
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const checks = {
      database: await this.checkDatabase(),
      memory: await this.checkMemory(),
      disk: await this.checkDisk(),
      api: await this.checkAPI(),
    };

    const overallStatus = this.determineOverallStatus(checks);
    const uptime = Date.now() - this.startTime;

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      uptime,
      version: '1.0.0',
    };
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    const [memory, disk, database, api] = await Promise.all([
      this.getMemoryMetrics(),
      this.getDiskMetrics(),
      this.getDatabaseMetrics(),
      this.getAPIMetrics(),
    ]);

    return {
      memory,
      disk,
      database,
      api,
    };
  }

  recordRequest(responseTime: number, isError: boolean = false): void {
    this.requestCount++;
    this.responseTimes.push(responseTime);
    
    if (isError) {
      this.errorCount++;
    }

    // Keep only last 1000 response times for average calculation
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
  }

  private async checkDatabase(): Promise<HealthCheck> {
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const queryTime = Date.now() - start;

      if (queryTime > 1000) {
        return {
          status: 'warn',
          message: 'Database response time is slow',
          details: { queryTime },
        };
      }

      return {
        status: 'pass',
        message: 'Database is healthy',
        details: { queryTime },
      };
    } catch (error) {
      return {
        status: 'fail',
        message: 'Database connection failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  private async checkMemory(): Promise<HealthCheck> {
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemory = memoryUsage.heapTotal;
      const usedMemory = memoryUsage.heapUsed;
      const percentage = (usedMemory / totalMemory) * 100;

      if (percentage > 90) {
        return {
          status: 'fail',
          message: 'Memory usage is critically high',
          details: { percentage, usedMemory, totalMemory },
        };
      }

      if (percentage > 80) {
        return {
          status: 'warn',
          message: 'Memory usage is high',
          details: { percentage, usedMemory, totalMemory },
        };
      }

      return {
        status: 'pass',
        message: 'Memory usage is normal',
        details: { percentage, usedMemory, totalMemory },
      };
    } catch (error) {
      return {
        status: 'fail',
        message: 'Failed to check memory usage',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  private async checkDisk(): Promise<HealthCheck> {
    try {
      // In a real implementation, you would check actual disk usage
      // For now, we'll simulate a check
      const diskUsage = {
        used: 0,
        free: 0,
        total: 0,
        percentage: 0,
      };

      if (diskUsage.percentage > 90) {
        return {
          status: 'fail',
          message: 'Disk usage is critically high',
          details: diskUsage,
        };
      }

      if (diskUsage.percentage > 80) {
        return {
          status: 'warn',
          message: 'Disk usage is high',
          details: diskUsage,
        };
      }

      return {
        status: 'pass',
        message: 'Disk usage is normal',
        details: diskUsage,
      };
    } catch (error) {
      return {
        status: 'fail',
        message: 'Failed to check disk usage',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  private async checkAPI(): Promise<HealthCheck> {
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;
    const averageResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
      : 0;

    if (errorRate > 10) {
      return {
        status: 'fail',
        message: 'API error rate is too high',
        details: { errorRate, averageResponseTime },
      };
    }

    if (errorRate > 5 || averageResponseTime > 2000) {
      return {
        status: 'warn',
        message: 'API performance is degraded',
        details: { errorRate, averageResponseTime },
      };
    }

    return {
      status: 'pass',
      message: 'API is healthy',
      details: { errorRate, averageResponseTime },
    };
  }

  private determineOverallStatus(checks: Record<string, HealthCheck>): 'healthy' | 'unhealthy' | 'degraded' {
    const statuses = Object.values(checks).map(check => check.status);
    
    if (statuses.includes('fail')) {
      return 'unhealthy';
    }
    
    if (statuses.includes('warn')) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  private async getMemoryMetrics(): Promise<SystemMetrics['memory']> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    const freeMemory = totalMemory - usedMemory;
    const percentage = (usedMemory / totalMemory) * 100;

    return {
      used: usedMemory,
      free: freeMemory,
      total: totalMemory,
      percentage,
    };
  }

  private async getDiskMetrics(): Promise<SystemMetrics['disk']> {
    // In a real implementation, you would check actual disk usage
    // For now, we'll return mock data
    return {
      used: 0,
      free: 0,
      total: 0,
      percentage: 0,
    };
  }

  private async getDatabaseMetrics(): Promise<SystemMetrics['database']> {
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const queryTime = Date.now() - start;

      // In a real implementation, you would get actual connection count
      const connections = 1;
      const errorRate = 0;

      return {
        connections,
        queryTime,
        errorRate,
      };
    } catch (error) {
      return {
        connections: 0,
        queryTime: 0,
        errorRate: 100,
      };
    }
  }

  private async getAPIMetrics(): Promise<SystemMetrics['api']> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // In a real implementation, you would track requests over time
    const requestsPerMinute = this.requestCount;
    const averageResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
      : 0;
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;

    return {
      requestsPerMinute,
      averageResponseTime,
      errorRate,
    };
  }

  async getDatabaseStats(): Promise<{
    totalUsers: number;
    totalClasses: number;
    totalReadingTexts: number;
    totalExercises: number;
    totalDrafts: number;
    totalAnnotations: number;
    totalChatMessages: number;
    totalPeerReviews: number;
    totalRevisions: number;
    totalFinalProducts: number;
  }> {
    const [
      totalUsers,
      totalClasses,
      totalReadingTexts,
      totalExercises,
      totalDrafts,
      totalAnnotations,
      totalChatMessages,
      totalPeerReviews,
      totalRevisions,
      totalFinalProducts,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.class.count(),
      prisma.readingText.count(),
      prisma.exercise.count(),
      prisma.writingDraft.count(),
      prisma.annotation.count(),
      prisma.chatMessage.count(),
      prisma.peerReview.count(),
      prisma.revision.count(),
      prisma.finalProduct.count(),
    ]);

    return {
      totalUsers,
      totalClasses,
      totalReadingTexts,
      totalExercises,
      totalDrafts,
      totalAnnotations,
      totalChatMessages,
      totalPeerReviews,
      totalRevisions,
      totalFinalProducts,
    };
  }

  async getRecentActivity(limit: number = 50): Promise<Array<{
    type: string;
    description: string;
    timestamp: Date;
    userId?: string;
    classId?: string;
  }>> {
    const activities = await prisma.history.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        class: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    });

    return activities.map((activity: any) => ({
      type: activity.action,
      description: `${activity.action} ${activity.tableName} record`,
      timestamp: activity.createdAt,
      userId: activity.userId,
      classId: activity.classId,
    }));
  }
}

export const monitoringService = new MonitoringService();
