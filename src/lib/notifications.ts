import { prisma } from './database.js';
import { createHistory } from './history.js';

export interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  actionUrl?: string;
  classId?: string;
}

export class NotificationService {
  async createNotification(data: NotificationData) {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        actionUrl: data.actionUrl,
        classId: data.classId,
        isRead: false,
      },
    });

    // Create history record
    await createHistory({
      tableName: 'notifications',
      recordId: notification.id,
      action: 'CREATE',
      newData: notification,
      userId: data.userId,
      classId: data.classId,
    });

    return notification;
  }

  async getUserNotifications(userId: string, limit: number = 50) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId: string) {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  // Notification templates
  async notifyClassInvite(userId: string, className: string, classId: string) {
    return this.createNotification({
      userId,
      title: 'Class Invitation',
      message: `You've been invited to join the class "${className}"`,
      type: 'info',
      actionUrl: `/classes/${classId}`,
      classId,
    });
  }

  async notifyNewReadingText(userId: string, textTitle: string, classId: string) {
    return this.createNotification({
      userId,
      title: 'New Reading Material',
      message: `New reading text "${textTitle}" has been added to your class`,
      type: 'info',
      actionUrl: `/classes/${classId}/reading`,
      classId,
    });
  }

  async notifyNewExercise(userId: string, exerciseTitle: string, classId: string) {
    return this.createNotification({
      userId,
      title: 'New Exercise',
      message: `New exercise "${exerciseTitle}" has been assigned`,
      type: 'info',
      actionUrl: `/classes/${classId}/exercises`,
      classId,
    });
  }

  async notifyPeerReview(userId: string, draftTitle: string, reviewerName: string, classId: string) {
    return this.createNotification({
      userId,
      title: 'New Peer Review',
      message: `${reviewerName} has reviewed your draft "${draftTitle}"`,
      type: 'info',
      actionUrl: `/classes/${classId}/drafts`,
      classId,
    });
  }

  async notifyRevisionStatus(userId: string, draftTitle: string, status: string, classId: string) {
    const statusMessages = {
      APPROVED: 'Your revision has been approved',
      REJECTED: 'Your revision needs more work',
      FINISHED: 'Your revision is complete',
    };

    return this.createNotification({
      userId,
      title: 'Revision Update',
      message: `${statusMessages[status as keyof typeof statusMessages]} for "${draftTitle}"`,
      type: status === 'APPROVED' ? 'success' : status === 'REJECTED' ? 'warning' : 'info',
      actionUrl: `/classes/${classId}/drafts`,
      classId,
    });
  }

  async notifyNewChatMessage(userId: string, senderName: string, classId: string) {
    return this.createNotification({
      userId,
      title: 'New Chat Message',
      message: `${senderName} sent a message in class chat`,
      type: 'info',
      actionUrl: `/classes/${classId}/chat`,
      classId,
    });
  }

  async notifyNewAnnotation(userId: string, textTitle: string, classId: string) {
    return this.createNotification({
      userId,
      title: 'New Annotation',
      message: `Someone added an annotation to "${textTitle}"`,
      type: 'info',
      actionUrl: `/classes/${classId}/reading`,
      classId,
    });
  }

  async notifyExerciseDue(userId: string, exerciseTitle: string, classId: string) {
    return this.createNotification({
      userId,
      title: 'Exercise Due Soon',
      message: `Exercise "${exerciseTitle}" is due soon`,
      type: 'warning',
      actionUrl: `/classes/${classId}/exercises`,
      classId,
    });
  }

  async notifyExerciseGraded(userId: string, exerciseTitle: string, score: number, classId: string) {
    return this.createNotification({
      userId,
      title: 'Exercise Graded',
      message: `Your exercise "${exerciseTitle}" has been graded. Score: ${score}`,
      type: 'info',
      actionUrl: `/classes/${classId}/exercises`,
      classId,
    });
  }

  async notifyFinalProductSubmitted(userId: string, productTitle: string, classId: string) {
    return this.createNotification({
      userId,
      title: 'Final Product Submitted',
      message: `Final product "${productTitle}" has been submitted`,
      type: 'success',
      actionUrl: `/classes/${classId}/products`,
      classId,
    });
  }
}

export const notificationService = new NotificationService();
