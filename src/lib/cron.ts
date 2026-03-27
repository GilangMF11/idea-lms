import cron from 'node-cron';
import { backupService } from './backup.js';
import { logger } from './logger.js';
import dotenv from 'dotenv';

dotenv.config();

let isCronActive = false;

/**
 * Initializes background tasks. Should only be called once on server startup.
 */
export function initBackgroundJobs() {
  if (isCronActive) {
    logger.debug('Background jobs are already initialized. Skipping.');
    return;
  }

  // Get cron schedule from environment, default to 2:00 AM every day
  const backupSchedule = process.env.BACKUP_CRON_SCHEDULE || '0 2 * * *';
  
  if (process.env.ENABLE_AUTO_BACKUP !== 'false') {
    logger.info(`Starting Master Backup Cron Job with schedule: ${backupSchedule}`);
    
    // Schedule the master backup
    cron.schedule(backupSchedule, async () => {
      logger.info('Executing scheduled Master System Backup...');
      try {
        const backupFileName = await backupService.createFullSystemBackup();
        logger.info(`Scheduled backup completed successfully: ${backupFileName}`);
        
        // Optional: Implement a cleanup mechanism here to keep only the last N backups
        await enforceBackupRetentionPolicy();
      } catch (error) {
        logger.error('Failed to execute scheduled Master Backup', undefined, error as Error);
      }
    });
    
    isCronActive = true;
  } else {
    logger.info('Auto Backup is disabled (ENABLE_AUTO_BACKUP is false).');
  }
}

/**
 * Keeps only the X most recent backups to save disk space
 */
async function enforceBackupRetentionPolicy() {
  try {
    const maxRetainedStr = process.env.BACKUP_RETENTION_COUNT || '5';
    const maxRetained = parseInt(maxRetainedStr, 10);
    
    if (isNaN(maxRetained) || maxRetained <= 0) return;

    const history = await backupService.getBackupHistory();
    if (history.length > maxRetained) {
      const toDelete = history.slice(maxRetained); // the oldest ones
      for (const oldBackup of toDelete) {
        await backupService.deleteBackup(oldBackup.filename);
        logger.info(`Deleted old backup due to retention policy: ${oldBackup.filename}`);
      }
    }
  } catch (error) {
    logger.error('Failed to enforce backup retention policy', undefined, error as Error);
  }
}
