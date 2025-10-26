import { prisma } from './database.js';
import { formatDate, formatDateTime } from './utils.js';

export interface ExportOptions {
  classId?: string;
  userId?: string;
  format: 'json' | 'csv' | 'xlsx';
  includeData: {
    users?: boolean;
    classes?: boolean;
    readingTexts?: boolean;
    exercises?: boolean;
    drafts?: boolean;
    annotations?: boolean;
    chatMessages?: boolean;
    peerReviews?: boolean;
    revisions?: boolean;
    finalProducts?: boolean;
  };
}

export class ExportService {
  async exportClassData(classId: string, options: ExportOptions): Promise<any> {
    const data: any = {};

    if (options.includeData.classes) {
      data.classes = await this.exportClasses(classId);
    }

    if (options.includeData.users) {
      data.users = await this.exportClassUsers(classId);
    }

    if (options.includeData.readingTexts) {
      data.readingTexts = await this.exportReadingTexts(classId);
    }

    if (options.includeData.exercises) {
      data.exercises = await this.exportExercises(classId);
    }

    if (options.includeData.drafts) {
      data.drafts = await this.exportWritingDrafts(classId);
    }

    if (options.includeData.annotations) {
      data.annotations = await this.exportAnnotations(classId);
    }

    if (options.includeData.chatMessages) {
      data.chatMessages = await this.exportChatMessages(classId);
    }

    if (options.includeData.peerReviews) {
      data.peerReviews = await this.exportPeerReviews(classId);
    }

    if (options.includeData.revisions) {
      data.revisions = await this.exportRevisions(classId);
    }

    if (options.includeData.finalProducts) {
      data.finalProducts = await this.exportFinalProducts(classId);
    }

    return this.formatExportData(data, options.format);
  }

  async exportUserData(userId: string, options: ExportOptions): Promise<any> {
    const data: any = {};

    if (options.includeData.users) {
      data.user = await this.exportUser(userId);
    }

    if (options.includeData.classes) {
      data.classes = await this.exportUserClasses(userId);
    }

    if (options.includeData.drafts) {
      data.drafts = await this.exportUserDrafts(userId);
    }

    if (options.includeData.annotations) {
      data.annotations = await this.exportUserAnnotations(userId);
    }

    if (options.includeData.peerReviews) {
      data.peerReviews = await this.exportUserPeerReviews(userId);
    }

    if (options.includeData.revisions) {
      data.revisions = await this.exportUserRevisions(userId);
    }

    if (options.includeData.finalProducts) {
      data.finalProducts = await this.exportUserFinalProducts(userId);
    }

    return this.formatExportData(data, options.format);
  }

  private async exportClasses(classId: string): Promise<any[]> {
    const classes = await prisma.class.findMany({
      where: { id: classId },
      include: {
        teacher: {
          select: {
            username: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        students: {
          include: {
            student: {
              select: {
                username: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return classes.map((cls: any) => ({
      id: cls.id,
      name: cls.name,
      description: cls.description,
      code: cls.code,
      teacher: cls.teacher,
      students: cls.students.map((s: any) => s.student),
      isActive: cls.isActive,
      createdAt: formatDateTime(cls.createdAt),
      updatedAt: formatDateTime(cls.updatedAt),
    }));
  }

  private async exportClassUsers(classId: string): Promise<any[]> {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { classesAsStudent: { some: { classId } } },
          { classesAsTeacher: { some: { id: classId } } },
        ],
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return users.map((user: any) => ({
      ...user,
      createdAt: formatDateTime(user.createdAt),
    }));
  }

  private async exportUser(userId: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) return null;

    return {
      ...user,
      createdAt: formatDateTime(user.createdAt),
      updatedAt: formatDateTime(user.updatedAt),
    };
  }

  private async exportUserClasses(userId: string): Promise<any[]> {
    const classes = await prisma.class.findMany({
      where: {
        OR: [
          { students: { some: { studentId: userId } } },
          { teacherId: userId },
        ],
      },
      include: {
        teacher: {
          select: {
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return classes.map((cls: any) => ({
      id: cls.id,
      name: cls.name,
      description: cls.description,
      code: cls.code,
      teacher: cls.teacher,
      isActive: cls.isActive,
      createdAt: formatDateTime(cls.createdAt),
    }));
  }

  private async exportReadingTexts(classId: string): Promise<any[]> {
    const texts = await prisma.readingText.findMany({
      where: { classId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return texts.map((text: any) => ({
      id: text.id,
      title: text.title,
      content: text.content,
      author: text.author,
      source: text.source,
      createdAt: formatDateTime(text.createdAt),
      updatedAt: formatDateTime(text.updatedAt),
    }));
  }

  private async exportExercises(classId: string): Promise<any[]> {
    const exercises = await prisma.exercise.findMany({
      where: { classId, isActive: true },
      include: {
        submissions: {
          include: {
            user: {
              select: {
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return exercises.map((exercise: any) => ({
      id: exercise.id,
      title: exercise.title,
      description: exercise.description,
      content: exercise.content,
      type: exercise.type,
      dueDate: exercise.dueDate ? formatDateTime(exercise.dueDate) : null,
      submissions: exercise.submissions.map((sub: any) => ({
        user: sub.user,
        answer: sub.answer,
        score: sub.score,
        feedback: sub.feedback,
        submittedAt: formatDateTime(sub.submittedAt),
      })),
      createdAt: formatDateTime(exercise.createdAt),
      updatedAt: formatDateTime(exercise.updatedAt),
    }));
  }

  private async exportWritingDrafts(classId: string): Promise<any[]> {
    const drafts = await prisma.writingDraft.findMany({
      where: { classId, isActive: true },
      include: {
        user: {
          select: {
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        outline: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return drafts.map((draft: any) => ({
      id: draft.id,
      title: draft.title,
      content: draft.content,
      author: draft.user,
      outline: draft.outline,
      createdAt: formatDateTime(draft.createdAt),
      updatedAt: formatDateTime(draft.updatedAt),
    }));
  }

  private async exportUserDrafts(userId: string): Promise<any[]> {
    const drafts = await prisma.writingDraft.findMany({
      where: { userId, isActive: true },
      include: {
        class: {
          select: {
            name: true,
            code: true,
          },
        },
        outline: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return drafts.map((draft: any) => ({
      id: draft.id,
      title: draft.title,
      content: draft.content,
      class: draft.class,
      outline: draft.outline,
      createdAt: formatDateTime(draft.createdAt),
      updatedAt: formatDateTime(draft.updatedAt),
    }));
  }

  private async exportAnnotations(classId: string): Promise<any[]> {
    const annotations = await prisma.annotation.findMany({
      where: { classId, isPublic: true },
      include: {
        user: {
          select: {
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        readingText: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return annotations.map((annotation: any) => ({
      id: annotation.id,
      content: annotation.content,
      author: annotation.user,
      readingText: annotation.readingText,
      startPos: annotation.startPos,
      endPos: annotation.endPos,
      color: annotation.color,
      isPublic: annotation.isPublic,
      createdAt: formatDateTime(annotation.createdAt),
    }));
  }

  private async exportUserAnnotations(userId: string): Promise<any[]> {
    const annotations = await prisma.annotation.findMany({
      where: { userId, isPublic: true },
      include: {
        readingText: {
          select: {
            title: true,
          },
        },
        class: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return annotations.map((annotation: any) => ({
      id: annotation.id,
      content: annotation.content,
      readingText: annotation.readingText,
      class: annotation.class,
      startPos: annotation.startPos,
      endPos: annotation.endPos,
      color: annotation.color,
      createdAt: formatDateTime(annotation.createdAt),
    }));
  }

  private async exportChatMessages(classId: string): Promise<any[]> {
    const messages = await prisma.chatMessage.findMany({
      where: { classId },
      include: {
        user: {
          select: {
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map((message: any) => ({
      id: message.id,
      content: message.content,
      author: message.user,
      createdAt: formatDateTime(message.createdAt),
    }));
  }

  private async exportPeerReviews(classId: string): Promise<any[]> {
    const reviews = await prisma.peerReview.findMany({
      where: { classId },
      include: {
        reviewer: {
          select: {
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        draft: {
          select: {
            title: true,
            user: {
              select: {
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map((review: any) => ({
      id: review.id,
      comment: review.comment,
      rating: review.rating,
      isPositive: review.isPositive,
      type: review.type,
      reviewer: review.reviewer,
      draft: review.draft,
      createdAt: formatDateTime(review.createdAt),
    }));
  }

  private async exportUserPeerReviews(userId: string): Promise<any[]> {
    const reviews = await prisma.peerReview.findMany({
      where: { reviewerId: userId },
      include: {
        draft: {
          select: {
            title: true,
            user: {
              select: {
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        class: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map((review: any) => ({
      id: review.id,
      comment: review.comment,
      rating: review.rating,
      isPositive: review.isPositive,
      type: review.type,
      draft: review.draft,
      class: review.class,
      createdAt: formatDateTime(review.createdAt),
    }));
  }

  private async exportRevisions(classId: string): Promise<any[]> {
    const revisions = await prisma.revision.findMany({
      where: { classId },
      include: {
        user: {
          select: {
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        draft: {
          select: {
            title: true,
          },
        },
        comments: {
          include: {
            user: {
              select: {
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return revisions.map((revision: any) => ({
      id: revision.id,
      content: revision.content,
      status: revision.status,
      feedback: revision.feedback,
      author: revision.user,
      draft: revision.draft,
      comments: revision.comments.map((comment: any) => ({
        comment: comment.comment,
        author: comment.user,
        createdAt: formatDateTime(comment.createdAt),
      })),
      createdAt: formatDateTime(revision.createdAt),
      updatedAt: formatDateTime(revision.updatedAt),
    }));
  }

  private async exportUserRevisions(userId: string): Promise<any[]> {
    const revisions = await prisma.revision.findMany({
      where: { userId },
      include: {
        draft: {
          select: {
            title: true,
          },
        },
        class: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return revisions.map((revision: any) => ({
      id: revision.id,
      content: revision.content,
      status: revision.status,
      feedback: revision.feedback,
      draft: revision.draft,
      class: revision.class,
      createdAt: formatDateTime(revision.createdAt),
      updatedAt: formatDateTime(revision.updatedAt),
    }));
  }

  private async exportFinalProducts(classId: string): Promise<any[]> {
    const products = await prisma.finalProduct.findMany({
      where: { classId },
      include: {
        user: {
          select: {
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        draft: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return products.map((product: any) => ({
      id: product.id,
      title: product.title,
      content: product.content,
      author: product.user,
      draft: product.draft,
      createdAt: formatDateTime(product.createdAt),
      updatedAt: formatDateTime(product.updatedAt),
    }));
  }

  private async exportUserFinalProducts(userId: string): Promise<any[]> {
    const products = await prisma.finalProduct.findMany({
      where: { userId },
      include: {
        draft: {
          select: {
            title: true,
          },
        },
        class: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return products.map((product: any) => ({
      id: product.id,
      title: product.title,
      content: product.content,
      draft: product.draft,
      class: product.class,
      createdAt: formatDateTime(product.createdAt),
      updatedAt: formatDateTime(product.updatedAt),
    }));
  }

  private formatExportData(data: any, format: string): any {
    switch (format) {
      case 'json':
        return data;
      case 'csv':
        return this.convertToCSV(data);
      case 'xlsx':
        return this.convertToXLSX(data);
      default:
        return data;
    }
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion - in production, use a proper CSV library
    const csvRows: string[] = [];
    
    for (const [tableName, records] of Object.entries(data)) {
      if (Array.isArray(records) && records.length > 0) {
        csvRows.push(`\n=== ${tableName.toUpperCase()} ===\n`);
        
        // Get headers from first record
        const headers = Object.keys(records[0]);
        csvRows.push(headers.join(','));
        
        // Add data rows
        for (const record of records) {
          const values = headers.map(header => {
            const value = record[header];
            if (typeof value === 'object' && value !== null) {
              return JSON.stringify(value);
            }
            return `"${String(value || '').replace(/"/g, '""')}"`;
          });
          csvRows.push(values.join(','));
        }
      }
    }
    
    return csvRows.join('\n');
  }

  private convertToXLSX(data: any): any {
    // Simple XLSX conversion - in production, use a proper XLSX library like 'xlsx'
    return {
      ...data,
      _format: 'xlsx',
      _note: 'XLSX format requires proper XLSX library implementation',
    };
  }
}

export const exportService = new ExportService();
