import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { backupService } from '$lib/backup.js';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';

export const POST: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const user = getAuthUser(request);
    requireAdmin(user);

    const { backupPath, clearExisting } = await request.json();

    if (!backupPath) {
      return json({ error: 'Backup path is required' }, { status: 400 });
    }

    await backupService.restoreBackup(backupPath, {
      clearExisting: clearExisting || false,
    });

    return json({ message: 'Backup restored successfully' });
  } catch (error) {
    return apiError(error);
  }
};
