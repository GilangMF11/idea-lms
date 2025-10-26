import { prisma } from './database.js';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { formatDateTime } from './utils.js';

export interface BackupOptions {
  includeData?: {
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
    histories?: boolean;
  };
  compress?: boolean;
  encrypt?: boolean;
}

export interface BackupData {
  metadata: {
    version: string;
    timestamp: string;
    tables: string[];
    recordCounts: Record<string, number>;
  };
  data: Record<string, any[]>;
}

export class BackupService {
  private backupDir: string;

  constructor(backupDir: string = 'backups') {
    this.backupDir = backupDir;
  }

  async createBackup(options: BackupOptions = {}): Promise<string> {
    const timestamp = formatDateTime(new Date()).replace(/[:.]/g, '-');
    const backupId = `backup-${timestamp}`;
    const backupPath = join(this.backupDir, `${backupId}.json`);

    // Ensure backup directory exists
    await mkdir(this.backupDir, { recursive: true });

    const backupData: BackupData = {
      metadata: {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        tables: [],
        recordCounts: {},
      },
      data: {},
    };

    // Export data based on options
    if (options.includeData?.users !== false) {
      backupData.data.users = await this.exportUsers();
      backupData.metadata.tables.push('users');
      backupData.metadata.recordCounts.users = backupData.data.users.length;
    }

    if (options.includeData?.classes !== false) {
      backupData.data.classes = await this.exportClasses();
      backupData.data.classStudents = await this.exportClassStudents();
      backupData.metadata.tables.push('classes', 'classStudents');
      backupData.metadata.recordCounts.classes = backupData.data.classes.length;
      backupData.metadata.recordCounts.classStudents = backupData.data.classStudents.length;
    }

    if (options.includeData?.readingTexts !== false) {
      backupData.data.readingTexts = await this.exportReadingTexts();
      backupData.metadata.tables.push('readingTexts');
      backupData.metadata.recordCounts.readingTexts = backupData.data.readingTexts.length;
    }

    if (options.includeData?.exercises !== false) {
      backupData.data.exercises = await this.exportExercises();
      backupData.data.exerciseSubmissions = await this.exportExerciseSubmissions();
      backupData.metadata.tables.push('exercises', 'exerciseSubmissions');
      backupData.metadata.recordCounts.exercises = backupData.data.exercises.length;
      backupData.metadata.recordCounts.exerciseSubmissions = backupData.data.exerciseSubmissions.length;
    }

    if (options.includeData?.drafts !== false) {
      backupData.data.writingOutlines = await this.exportWritingOutlines();
      backupData.data.writingDrafts = await this.exportWritingDrafts();
      backupData.metadata.tables.push('writingOutlines', 'writingDrafts');
      backupData.metadata.recordCounts.writingOutlines = backupData.data.writingOutlines.length;
      backupData.metadata.recordCounts.writingDrafts = backupData.data.writingDrafts.length;
    }

    if (options.includeData?.annotations !== false) {
      backupData.data.annotations = await this.exportAnnotations();
      backupData.metadata.tables.push('annotations');
      backupData.metadata.recordCounts.annotations = backupData.data.annotations.length;
    }

    if (options.includeData?.chatMessages !== false) {
      backupData.data.chatMessages = await this.exportChatMessages();
      backupData.metadata.tables.push('chatMessages');
      backupData.metadata.recordCounts.chatMessages = backupData.data.chatMessages.length;
    }

    if (options.includeData?.peerReviews !== false) {
      backupData.data.peerReviews = await this.exportPeerReviews();
      backupData.metadata.tables.push('peerReviews');
      backupData.metadata.recordCounts.peerReviews = backupData.data.peerReviews.length;
    }

    if (options.includeData?.revisions !== false) {
      backupData.data.revisions = await this.exportRevisions();
      backupData.data.revisionComments = await this.exportRevisionComments();
      backupData.metadata.tables.push('revisions', 'revisionComments');
      backupData.metadata.recordCounts.revisions = backupData.data.revisions.length;
      backupData.metadata.recordCounts.revisionComments = backupData.data.revisionComments.length;
    }

    if (options.includeData?.finalProducts !== false) {
      backupData.data.finalProducts = await this.exportFinalProducts();
      backupData.metadata.tables.push('finalProducts');
      backupData.metadata.recordCounts.finalProducts = backupData.data.finalProducts.length;
    }

    if (options.includeData?.histories !== false) {
      backupData.data.histories = await this.exportHistories();
      backupData.metadata.tables.push('histories');
      backupData.metadata.recordCounts.histories = backupData.data.histories.length;
    }

    // Write backup file
    await writeFile(backupPath, JSON.stringify(backupData, null, 2));

    return backupPath;
  }

  async restoreBackup(backupPath: string, options: { clearExisting?: boolean } = {}): Promise<void> {
    const backupData: BackupData = JSON.parse(await readFile(backupPath, 'utf-8'));

    if (options.clearExisting) {
      await this.clearAllData();
    }

    // Restore data in order of dependencies
    if (backupData.data.users) {
      await this.restoreUsers(backupData.data.users);
    }

    if (backupData.data.classes) {
      await this.restoreClasses(backupData.data.classes);
    }

    if (backupData.data.classStudents) {
      await this.restoreClassStudents(backupData.data.classStudents);
    }

    if (backupData.data.readingTexts) {
      await this.restoreReadingTexts(backupData.data.readingTexts);
    }

    if (backupData.data.exercises) {
      await this.restoreExercises(backupData.data.exercises);
    }

    if (backupData.data.exerciseSubmissions) {
      await this.restoreExerciseSubmissions(backupData.data.exerciseSubmissions);
    }

    if (backupData.data.writingOutlines) {
      await this.restoreWritingOutlines(backupData.data.writingOutlines);
    }

    if (backupData.data.writingDrafts) {
      await this.restoreWritingDrafts(backupData.data.writingDrafts);
    }

    if (backupData.data.annotations) {
      await this.restoreAnnotations(backupData.data.annotations);
    }

    if (backupData.data.chatMessages) {
      await this.restoreChatMessages(backupData.data.chatMessages);
    }

    if (backupData.data.peerReviews) {
      await this.restorePeerReviews(backupData.data.peerReviews);
    }

    if (backupData.data.revisions) {
      await this.restoreRevisions(backupData.data.revisions);
    }

    if (backupData.data.revisionComments) {
      await this.restoreRevisionComments(backupData.data.revisionComments);
    }

    if (backupData.data.finalProducts) {
      await this.restoreFinalProducts(backupData.data.finalProducts);
    }

    if (backupData.data.histories) {
      await this.restoreHistories(backupData.data.histories);
    }
  }

  async listBackups(): Promise<string[]> {
    // In a real implementation, you would read the backup directory
    // and return a list of available backup files
    return [];
  }

  async deleteBackup(backupPath: string): Promise<void> {
    // In a real implementation, you would delete the backup file
    console.log(`Deleting backup: ${backupPath}`);
  }

  private async clearAllData(): Promise<void> {
    // Delete in reverse order of dependencies
    await prisma.history.deleteMany();
    await prisma.finalProduct.deleteMany();
    await prisma.revisionComment.deleteMany();
    await prisma.revision.deleteMany();
    await prisma.peerReview.deleteMany();
    await prisma.writingDraft.deleteMany();
    await prisma.writingOutline.deleteMany();
    await prisma.exerciseSubmission.deleteMany();
    await prisma.exercise.deleteMany();
    await prisma.annotation.deleteMany();
    await prisma.chatMessage.deleteMany();
    await prisma.readingText.deleteMany();
    await prisma.classStudent.deleteMany();
    await prisma.class.deleteMany();
    await prisma.user.deleteMany();
  }

  // Export methods
  private async exportUsers(): Promise<any[]> {
    return prisma.user.findMany();
  }

  private async exportClasses(): Promise<any[]> {
    return prisma.class.findMany();
  }

  private async exportClassStudents(): Promise<any[]> {
    return prisma.classStudent.findMany();
  }

  private async exportReadingTexts(): Promise<any[]> {
    return prisma.readingText.findMany();
  }

  private async exportExercises(): Promise<any[]> {
    return prisma.exercise.findMany();
  }

  private async exportExerciseSubmissions(): Promise<any[]> {
    return prisma.exerciseSubmission.findMany();
  }

  private async exportWritingOutlines(): Promise<any[]> {
    return prisma.writingOutline.findMany();
  }

  private async exportWritingDrafts(): Promise<any[]> {
    return prisma.writingDraft.findMany();
  }

  private async exportAnnotations(): Promise<any[]> {
    return prisma.annotation.findMany();
  }

  private async exportChatMessages(): Promise<any[]> {
    return prisma.chatMessage.findMany();
  }

  private async exportPeerReviews(): Promise<any[]> {
    return prisma.peerReview.findMany();
  }

  private async exportRevisions(): Promise<any[]> {
    return prisma.revision.findMany();
  }

  private async exportRevisionComments(): Promise<any[]> {
    return prisma.revisionComment.findMany();
  }

  private async exportFinalProducts(): Promise<any[]> {
    return prisma.finalProduct.findMany();
  }

  private async exportHistories(): Promise<any[]> {
    return prisma.history.findMany();
  }

  // Restore methods
  private async restoreUsers(users: any[]): Promise<void> {
    for (const user of users) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: user,
        create: user,
      });
    }
  }

  private async restoreClasses(classes: any[]): Promise<void> {
    for (const cls of classes) {
      await prisma.class.upsert({
        where: { id: cls.id },
        update: cls,
        create: cls,
      });
    }
  }

  private async restoreClassStudents(classStudents: any[]): Promise<void> {
    for (const classStudent of classStudents) {
      await prisma.classStudent.upsert({
        where: { id: classStudent.id },
        update: classStudent,
        create: classStudent,
      });
    }
  }

  private async restoreReadingTexts(readingTexts: any[]): Promise<void> {
    for (const text of readingTexts) {
      await prisma.readingText.upsert({
        where: { id: text.id },
        update: text,
        create: text,
      });
    }
  }

  private async restoreExercises(exercises: any[]): Promise<void> {
    for (const exercise of exercises) {
      await prisma.exercise.upsert({
        where: { id: exercise.id },
        update: exercise,
        create: exercise,
      });
    }
  }

  private async restoreExerciseSubmissions(submissions: any[]): Promise<void> {
    for (const submission of submissions) {
      await prisma.exerciseSubmission.upsert({
        where: { id: submission.id },
        update: submission,
        create: submission,
      });
    }
  }

  private async restoreWritingOutlines(outlines: any[]): Promise<void> {
    for (const outline of outlines) {
      await prisma.writingOutline.upsert({
        where: { id: outline.id },
        update: outline,
        create: outline,
      });
    }
  }

  private async restoreWritingDrafts(drafts: any[]): Promise<void> {
    for (const draft of drafts) {
      await prisma.writingDraft.upsert({
        where: { id: draft.id },
        update: draft,
        create: draft,
      });
    }
  }

  private async restoreAnnotations(annotations: any[]): Promise<void> {
    for (const annotation of annotations) {
      await prisma.annotation.upsert({
        where: { id: annotation.id },
        update: annotation,
        create: annotation,
      });
    }
  }

  private async restoreChatMessages(messages: any[]): Promise<void> {
    for (const message of messages) {
      await prisma.chatMessage.upsert({
        where: { id: message.id },
        update: message,
        create: message,
      });
    }
  }

  private async restorePeerReviews(reviews: any[]): Promise<void> {
    for (const review of reviews) {
      await prisma.peerReview.upsert({
        where: { id: review.id },
        update: review,
        create: review,
      });
    }
  }

  private async restoreRevisions(revisions: any[]): Promise<void> {
    for (const revision of revisions) {
      await prisma.revision.upsert({
        where: { id: revision.id },
        update: revision,
        create: revision,
      });
    }
  }

  private async restoreRevisionComments(comments: any[]): Promise<void> {
    for (const comment of comments) {
      await prisma.revisionComment.upsert({
        where: { id: comment.id },
        update: comment,
        create: comment,
      });
    }
  }

  private async restoreFinalProducts(products: any[]): Promise<void> {
    for (const product of products) {
      await prisma.finalProduct.upsert({
        where: { id: product.id },
        update: product,
        create: product,
      });
    }
  }

  private async restoreHistories(histories: any[]): Promise<void> {
    for (const history of histories) {
      await prisma.history.upsert({
        where: { id: history.id },
        update: history,
        create: history,
      });
    }
  }
}

export const backupService = new BackupService();
