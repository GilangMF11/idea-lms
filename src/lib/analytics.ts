import { prisma } from './database.js';

export interface ClassAnalytics {
  totalStudents: number;
  totalReadingTexts: number;
  totalExercises: number;
  totalDrafts: number;
  totalAnnotations: number;
  totalChatMessages: number;
  activeStudents: number;
  completedExercises: number;
  averageExerciseScore: number;
  recentActivity: Array<{
    type: string;
    title: string;
    timestamp: Date;
    user: string;
  }>;
}

export interface UserAnalytics {
  totalClasses: number;
  totalDrafts: number;
  totalAnnotations: number;
  totalPeerReviews: number;
  totalRevisions: number;
  averageDraftScore: number;
  recentActivity: Array<{
    type: string;
    title: string;
    timestamp: Date;
    classId: string;
  }>;
}

export class AnalyticsService {
  async getClassAnalytics(classId: string): Promise<ClassAnalytics> {
    const [
      totalStudents,
      totalReadingTexts,
      totalExercises,
      totalDrafts,
      totalAnnotations,
      totalChatMessages,
      activeStudents,
      completedExercises,
      averageExerciseScore,
      recentActivity,
    ] = await Promise.all([
      this.getTotalStudents(classId),
      this.getTotalReadingTexts(classId),
      this.getTotalExercises(classId),
      this.getTotalDrafts(classId),
      this.getTotalAnnotations(classId),
      this.getTotalChatMessages(classId),
      this.getActiveStudents(classId),
      this.getCompletedExercises(classId),
      this.getAverageExerciseScore(classId),
      this.getRecentActivity(classId),
    ]);

    return {
      totalStudents,
      totalReadingTexts,
      totalExercises,
      totalDrafts,
      totalAnnotations,
      totalChatMessages,
      activeStudents,
      completedExercises,
      averageExerciseScore,
      recentActivity,
    };
  }

  async getUserAnalytics(userId: string): Promise<UserAnalytics> {
    const [
      totalClasses,
      totalDrafts,
      totalAnnotations,
      totalPeerReviews,
      totalRevisions,
      averageDraftScore,
      recentActivity,
    ] = await Promise.all([
      this.getUserTotalClasses(userId),
      this.getUserTotalDrafts(userId),
      this.getUserTotalAnnotations(userId),
      this.getUserTotalPeerReviews(userId),
      this.getUserTotalRevisions(userId),
      this.getUserAverageDraftScore(userId),
      this.getUserRecentActivity(userId),
    ]);

    return {
      totalClasses,
      totalDrafts,
      totalAnnotations,
      totalPeerReviews,
      totalRevisions,
      averageDraftScore,
      recentActivity,
    };
  }

  private async getTotalStudents(classId: string): Promise<number> {
    return prisma.classStudent.count({
      where: { classId },
    });
  }

  private async getTotalReadingTexts(classId: string): Promise<number> {
    return prisma.readingText.count({
      where: { classId, isActive: true },
    });
  }

  private async getTotalExercises(classId: string): Promise<number> {
    return prisma.exercise.count({
      where: { classId, isActive: true },
    });
  }

  private async getTotalDrafts(classId: string): Promise<number> {
    return prisma.writingDraft.count({
      where: { classId, isActive: true },
    });
  }

  private async getTotalAnnotations(classId: string): Promise<number> {
    return prisma.annotation.count({
      where: { classId, isPublic: true },
    });
  }

  private async getTotalChatMessages(classId: string): Promise<number> {
    return prisma.chatMessage.count({
      where: { classId },
    });
  }

  private async getActiveStudents(classId: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeStudents = await prisma.user.findMany({
      where: {
        classesAsStudent: {
          some: { classId },
        },
        OR: [
          { annotations: { some: { classId, createdAt: { gte: thirtyDaysAgo } } } },
          { chatMessages: { some: { classId, createdAt: { gte: thirtyDaysAgo } } } },
          { writingDrafts: { some: { classId, updatedAt: { gte: thirtyDaysAgo } } } },
          { exerciseSubmissions: { some: { exercise: { classId }, submittedAt: { gte: thirtyDaysAgo } } } },
        ],
      },
      select: { id: true },
    });

    return activeStudents.length;
  }

  private async getCompletedExercises(classId: string): Promise<number> {
    return prisma.exerciseSubmission.count({
      where: {
        exercise: { classId },
      },
    });
  }

  private async getAverageExerciseScore(classId: string): Promise<number> {
    const result = await prisma.exerciseSubmission.aggregate({
      where: {
        exercise: { classId },
        score: { not: null },
      },
      _avg: { score: true },
    });

    return result._avg.score || 0;
  }

  private async getRecentActivity(classId: string): Promise<Array<{
    type: string;
    title: string;
    timestamp: Date;
    user: string;
  }>> {
    const activities = [];

    // Recent reading texts
    const readingTexts = await prisma.readingText.findMany({
      where: { classId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        class: {
          include: {
            teacher: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    activities.push(...readingTexts.map((text: any) => ({
      type: 'reading_text',
      title: text.title,
      timestamp: text.createdAt,
      user: `${text.class.teacher.firstName} ${text.class.teacher.lastName}`,
    })));

    // Recent exercises
    const exercises = await prisma.exercise.findMany({
      where: { classId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        class: {
          include: {
            teacher: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    activities.push(...exercises.map((exercise: any) => ({
      type: 'exercise',
      title: exercise.title,
      timestamp: exercise.createdAt,
      user: `${exercise.class.teacher.firstName} ${exercise.class.teacher.lastName}`,
    })));

    // Recent chat messages
    const chatMessages = await prisma.chatMessage.findMany({
      where: { classId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    activities.push(...chatMessages.map((message: any) => ({
      type: 'chat',
      title: `Message: ${message.content.substring(0, 50)}...`,
      timestamp: message.createdAt,
      user: `${message.user.firstName} ${message.user.lastName}`,
    })));

    // Sort by timestamp and return top 10
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  }

  private async getUserTotalClasses(userId: string): Promise<number> {
    return prisma.classStudent.count({
      where: { studentId: userId },
    });
  }

  private async getUserTotalDrafts(userId: string): Promise<number> {
    return prisma.writingDraft.count({
      where: { userId, isActive: true },
    });
  }

  private async getUserTotalAnnotations(userId: string): Promise<number> {
    return prisma.annotation.count({
      where: { userId, isPublic: true },
    });
  }

  private async getUserTotalPeerReviews(userId: string): Promise<number> {
    return prisma.peerReview.count({
      where: { reviewerId: userId },
    });
  }

  private async getUserTotalRevisions(userId: string): Promise<number> {
    return prisma.revision.count({
      where: { userId },
    });
  }

  private async getUserAverageDraftScore(userId: string): Promise<number> {
    const result = await prisma.peerReview.aggregate({
      where: {
        draft: { userId },
        rating: { not: null },
      },
      _avg: { rating: true },
    });

    return result._avg.rating || 0;
  }

  private async getUserRecentActivity(userId: string): Promise<Array<{
    type: string;
    title: string;
    timestamp: Date;
    classId: string;
  }>> {
    const activities = [];

    // Recent drafts
    const drafts = await prisma.writingDraft.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    activities.push(...drafts.map((draft: any) => ({
      type: 'draft',
      title: draft.title,
      timestamp: draft.updatedAt,
      classId: draft.classId,
    })));

    // Recent annotations
    const annotations = await prisma.annotation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    activities.push(...annotations.map((annotation: any) => ({
      type: 'annotation',
      title: `Annotation: ${annotation.content.substring(0, 50)}...`,
      timestamp: annotation.createdAt,
      classId: annotation.classId,
    })));

    // Recent peer reviews
    const peerReviews = await prisma.peerReview.findMany({
      where: { reviewerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        draft: {
          select: { title: true, classId: true },
        },
      },
    });

    activities.push(...peerReviews.map((review: any) => ({
      type: 'peer_review',
      title: `Review: ${review.draft.title}`,
      timestamp: review.createdAt,
      classId: review.draft.classId,
    })));

    // Sort by timestamp and return top 10
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  }

  async getSystemAnalytics(): Promise<{
    totalUsers: number;
    totalClasses: number;
    totalReadingTexts: number;
    totalExercises: number;
    totalDrafts: number;
    totalAnnotations: number;
    totalChatMessages: number;
    activeUsers: number;
  }> {
    const [
      totalUsers,
      totalClasses,
      totalReadingTexts,
      totalExercises,
      totalDrafts,
      totalAnnotations,
      totalChatMessages,
      activeUsers,
    ] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.class.count({ where: { isActive: true } }),
      prisma.readingText.count({ where: { isActive: true } }),
      prisma.exercise.count({ where: { isActive: true } }),
      prisma.writingDraft.count({ where: { isActive: true } }),
      prisma.annotation.count({ where: { isPublic: true } }),
      prisma.chatMessage.count(),
      this.getActiveUsers(),
    ]);

    return {
      totalUsers,
      totalClasses,
      totalReadingTexts,
      totalExercises,
      totalDrafts,
      totalAnnotations,
      totalChatMessages,
      activeUsers,
    };
  }

  private async getActiveUsers(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { annotations: { some: { createdAt: { gte: thirtyDaysAgo } } } },
          { chatMessages: { some: { createdAt: { gte: thirtyDaysAgo } } } },
          { writingDrafts: { some: { updatedAt: { gte: thirtyDaysAgo } } } },
          { exerciseSubmissions: { some: { submittedAt: { gte: thirtyDaysAgo } } } },
        ],
      },
      select: { id: true },
    });

    return activeUsers.length;
  }
}

export const analyticsService = new AnalyticsService();
