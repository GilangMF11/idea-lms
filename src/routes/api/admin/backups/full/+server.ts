import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { verifyToken } from '$lib/auth.js';
import { backupService } from '$lib/backup.js';
import { logger } from '$lib/logger.js';
import { stat } from 'fs/promises';
import { join } from 'path';

// Helper to check admin
function isAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const user = verifyToken(token);
  return user?.role === 'ADMIN' ? user : null;
}

// 1. GET: Retrieve list of historical backups
export const GET: RequestHandler = async ({ request }) => {
  try {
    const user = isAdmin(request);
    if (!user) return json({ error: 'Forbidden' }, { status: 403 });

    const history = await backupService.getBackupHistory();
    return json({ backups: history });
  } catch (error) {
    logger.error('Error fetching backup history', undefined, error as Error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

// 2. POST: Trigger a manual master backup
export const POST: RequestHandler = async ({ request }) => {
  try {
    const user = isAdmin(request);
    if (!user) return json({ error: 'Forbidden' }, { status: 403 });

    logger.info(`On-demand master backup initiated by admin: ${user.id}`);
    const filename = await backupService.createFullSystemBackup();
    
    return json({ 
      message: 'Backup created successfully',
      filename 
    });
  } catch (error) {
    logger.error('Error generating manual backup', undefined, error as Error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

// 3. DELETE: Deletes an old backup
export const DELETE: RequestHandler = async ({ request, url }) => {
  try {
    const user = isAdmin(request);
    if (!user) return json({ error: 'Forbidden' }, { status: 403 });

    const filename = url.searchParams.get('filename');
    if (!filename) return json({ error: 'Filename is required' }, { status: 400 });

    logger.info(`Backup deletion requested by admin: ${user.id} for file: ${filename}`);
    const success = await backupService.deleteBackup(filename);
    
    if (success) {
      return json({ message: 'Backup deleted successfully' });
    } else {
      return json({ error: 'Failed to delete backup' }, { status: 500 });
    }
  } catch (error) {
    logger.error('Error deleting backup', undefined, error as Error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
