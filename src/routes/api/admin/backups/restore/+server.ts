import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { verifyToken } from '$lib/auth.js';
import { backupService } from '$lib/backup.js';
import { logger } from '$lib/logger.js';

// Helper to check admin
function isAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const user = verifyToken(token);
  return user?.role === 'ADMIN' ? user : null;
}

// POST: Trigger a highly destructive full restore
export const POST: RequestHandler = async ({ request }) => {
  try {
    const user = isAdmin(request);
    if (!user) return json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const filename = body.filename;
    
    if (!filename) {
      return json({ error: 'Filename is required' }, { status: 400 });
    }

    logger.warn(`CRITICAL: Full system restore initiated by admin: ${user.id} for file: ${filename}`);
    
    // Attempt restore
    await backupService.restoreFullSystemBackup(filename);
    
    logger.info(`System successfully restored from ${filename} by admin: ${user.id}`);
    
    return json({ message: 'System restored successfully' });
  } catch (error) {
    logger.error('CRITICAL: System restore failed', undefined, error as Error);
    return json({ error: 'Internal server error during restore operation' }, { status: 500 });
  }
};
