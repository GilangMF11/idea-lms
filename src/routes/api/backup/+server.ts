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
      return json({ error: 'Only administrators can create backups' }, { status: 403 });
    }

    const { includeData, compress, encrypt } = await request.json();

    const backupPath = await backupService.createBackup({
      includeData: includeData || {},
      compress: compress || false,
      encrypt: encrypt || false,
    });

    return json({ 
      message: 'Backup created successfully',
      backupPath,
    });
  } catch (error) {
    console.error('Backup error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const GET: RequestHandler = async ({ request }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (!user || user.role !== 'ADMIN') {
      return json({ error: 'Only administrators can list backups' }, { status: 403 });
    }

    const backups = await backupService.listBackups();

    return json({ backups });
  } catch (error) {
    console.error('List backups error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ request, url }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (!user || user.role !== 'ADMIN') {
      return json({ error: 'Only administrators can delete backups' }, { status: 403 });
    }

    const backupPath = url.searchParams.get('path');
    if (!backupPath) {
      return json({ error: 'Backup path is required' }, { status: 400 });
    }

    await backupService.deleteBackup(backupPath);

    return json({ message: 'Backup deleted successfully' });
  } catch (error) {
    console.error('Delete backup error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
