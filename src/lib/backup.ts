import { prisma } from './database.js';
import { writeFile, readFile, mkdir, readdir, stat, rm } from 'fs/promises';
import { createWriteStream, createReadStream } from 'fs';
import { join, basename } from 'path';
import { formatDateTime } from './utils.js';
import crypto from 'crypto';
import archiver from 'archiver';
import AdmZip from 'adm-zip';
import dotenv from 'dotenv';
import { logger } from './logger.js';

// Load .env explicitly for cron limits if not in SvelteKit context
dotenv.config();

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

  async generateBackupData(options: BackupOptions = {}): Promise<BackupData> {
    const backupData: BackupData = {
      metadata: {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        tables: [],
        recordCounts: {},
      },
      data: {},
    };

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

    return backupData;
  }

  async createBackup(options: BackupOptions = {}): Promise<string> {
    const timestamp = formatDateTime(new Date()).replace(/[:.]/g, '-');
    const backupId = `backup-${timestamp}`;
    const backupPath = join(this.backupDir, `${backupId}.json`);

    await mkdir(this.backupDir, { recursive: true });

    const backupData = await this.generateBackupData(options);

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

  // --- MASTER FULL BACKUP SYSTEM ---

  /**
   * Generates a fully encrypted ZIP archive containing the database and uploads directory.
   */
  async createFullSystemBackup(password?: string): Promise<string> {
    const backupPassword = password || process.env.BACKUP_PASSWORD;
    if (!backupPassword) {
      throw new Error('BACKUP_PASSWORD environment variable is not set. Cannot encrypt backup.');
    }

    const timestamp = formatDateTime(new Date()).replace(/[:.]/g, '-');
    const backupId = `master-${timestamp}`;
    const backupFileName = `${backupId}.zip.enc`;
    const finalDestPath = join(this.backupDir, backupFileName);

    await mkdir(this.backupDir, { recursive: true });

    return new Promise(async (resolve, reject) => {
      try {
        const outputStream = createWriteStream(finalDestPath);
        
        // Setup AES-256-CBC Encryption Stream
        const iv = crypto.randomBytes(16);
        const key = crypto.scryptSync(backupPassword, 'lms-salt', 32);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

        outputStream.on('error', reject);
        cipher.on('error', reject);

        // First 16 bytes of the file will be the IV
        outputStream.write(iv);

        // Pipe archiver -> cipher -> file
        const archive = archiver('zip', {
          zlib: { level: 9 } // Maximum compression
        });

        archive.on('error', reject);
        archive.pipe(cipher).pipe(outputStream);

        // 1. Add Database JSON
        logger.info('Generating database JSON for master backup...');
        const dbData = await this.generateBackupData();
        // Convert BigInts safely
        const dbJson = JSON.stringify(dbData, (key, value) => 
          typeof value === 'bigint' ? value.toString() : value
        , 2);
        archive.append(dbJson, { name: 'database.json' });

        // 2. Add Uploads / Files Directory
        const uploadsDir = join(process.cwd(), 'uploads');
        try {
          const uploadsStat = await stat(uploadsDir);
          if (uploadsStat.isDirectory()) {
            logger.info('Adding uploads directory to master backup...');
            archive.directory(uploadsDir, 'uploads');
          }
        } catch (e) {
          logger.warn('Uploads directory not found or inaccessible; skipping file attachments in backup.');
        }

        // 3. Add .env backup (optional, but requested for 'Configuration')
        try {
          const envPath = join(process.cwd(), '.env');
          await stat(envPath);
          archive.file(envPath, { name: '.env.backup' });
        } catch (e) {
          logger.warn('.env file not found; skipping in backup.');
        }

        // Finalize Zip Building (Triggers stream ends)
        await archive.finalize();

        outputStream.on('finish', () => {
          logger.info(`Master backup successfully created and encrypted: ${backupFileName}`);
          resolve(backupFileName);
        });

      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Retrieves all available encrypted backup files from the local backups directory.
   */
  async getBackupHistory(): Promise<Array<{ filename: string; sizeBytes: number; createdAt: Date }>> {
    try {
      await mkdir(this.backupDir, { recursive: true });
      const files = await readdir(this.backupDir);
      
      const backups = [];
      for (const file of files) {
        if (file.endsWith('.enc')) {
          const fileStat = await stat(join(this.backupDir, file));
          backups.push({
            filename: file,
            sizeBytes: fileStat.size,
            createdAt: fileStat.birthtime
          });
        }
      }

      // Sort descending by creation date
      return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (e) {
      logger.error('Failed to retrieve backup history', undefined, e as Error);
      return [];
    }
  }

  /**
   * Deletes a specific master backup file.
   */
  async deleteBackup(filename: string): Promise<boolean> {
    try {
      // Security check to prevent path traversal
      if (filename.includes('/') || filename.includes('..')) {
        throw new Error('Invalid filename');
      }
      
      const targetPath = join(this.backupDir, filename);
      await rm(targetPath);
      return true;
    } catch (err) {
      logger.error(`Failed to delete backup file: ${filename}`, undefined, err as Error);
      return false;
    }
  }

  /**
   * Restores a master backup: Decrypts .enc, unzips, restores database, and copies files.
   * VERY DESTRUCTIVE processing.
   */
  async restoreFullSystemBackup(filename: string, password?: string): Promise<void> {
    const backupPassword = password || process.env.BACKUP_PASSWORD;
    if (!backupPassword) {
      throw new Error('BACKUP_PASSWORD environment variable is not set. Cannot decrypt backup.');
    }

    if (filename.includes('/') || filename.includes('..')) {
      throw new Error('Invalid backup filename');
    }

    const encryptedFilePath = join(this.backupDir, filename);
    const tempExtractDir = join(this.backupDir, `restore_temp_${Date.now()}`);

    try {
      // 1. Verify existence
      await stat(encryptedFilePath);
      
      // 2. Read IV (First 16 bytes)
      const iv = Buffer.alloc(16);
      const fd = await readFile(encryptedFilePath);
      fd.copy(iv, 0, 0, 16);
      
      const encryptedContent = fd.subarray(16);

      // 3. Decrypt buffer directly into RAM (Requires RAM >= Backup size)
      // Since backups might grow, stream would be better but memory buffer is fine for MVP.
      const key = crypto.scryptSync(backupPassword, 'lms-salt', 32);
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      
      let decryptedBuffer = decipher.update(encryptedContent);
      decryptedBuffer = Buffer.concat([decryptedBuffer, decipher.final()]);

      // 4. Extract ZIP via adm-zip using decrypted buffer
      logger.info('Archive decrypted. Extracting files...');
      const zip = new AdmZip(decryptedBuffer);
      
      zip.extractAllTo(tempExtractDir, true);

      // 5. Restore Database from extracted database.json
      const dbJsonPath = join(tempExtractDir, 'database.json');
      try {
        await stat(dbJsonPath);
        logger.info('Restoring Database models...');
        // Reuse original RESTORE method but point to specific extracted JSON
        await this.restoreBackup(dbJsonPath, { clearExisting: false }); // Avoid total teardown if not required, or set true
      } catch (e) {
        logger.warn('No database.json found inside the backup archive.');
      }

      // 6. Restore Files
      // Copy 'uploads' folder extracted to process.cwd()/uploads
      const extractedUploadsDir = join(tempExtractDir, 'uploads');
      try {
        await stat(extractedUploadsDir);
        logger.info('Restoring file attachments...');
        // recursive copy logic missing in standard fs, but we can use cp in Node 16.7+
        const fsPromises = await import('fs/promises');
        await fsPromises.cp(extractedUploadsDir, join(process.cwd(), 'uploads'), { recursive: true, force: true });
      } catch (e) {
        logger.warn('No uploads/ directory found in backup or could not overwrite.');
      }

      logger.info(`Successfully restored master system from ${filename}`);
      
    } catch (err) {
      logger.error('Full system restore failed horribly.', undefined, err as Error);
      throw err;
    } finally {
      // 7. Cleanup temp extracted files to prevent leak
      try {
        await rm(tempExtractDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup failure
      }
    }
  }
}

export const backupService = new BackupService();
