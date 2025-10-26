import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { backupService } from '$lib/backup.js';
import { verifyToken } from '$lib/auth.js';

export const POST: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (!user || user.role !== 'ADMIN') {
      return json({ error: 'Only administrators can restore backups' }, { status: 403 });
    }

    const { backupPath, clearExisting } = await request.json();

    if (!backupPath) {
      return json({ error: 'Backup path is required' }, { status: 400 });
    }

    await backupService.restoreBackup(backupPath, {
      clearExisting: clearExisting || false,
    });

    return json({ message: 'Backup restored successfully' });
  } catch (error) {
    console.error('Restore error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
