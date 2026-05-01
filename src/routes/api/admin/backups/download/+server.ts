import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { verifyToken } from '$lib/auth.js';
import { logger } from '$lib/logger.js';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { join } from 'path';

function isAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const user = verifyToken(token);
  return user?.role === 'ADMIN' ? user : null;
}

export const GET: RequestHandler = async ({ request, url }) => {
  try {
    const user = isAdmin(request);
    if (!user) return json({ error: 'Forbidden' }, { status: 403 });

    // The backup.ts defaults to 'backups' directory, so we pull from there
    const filename = url.searchParams.get('filename');
    if (!filename || filename.includes('/') || filename.includes('..')) {
      return json({ error: 'Invalid filename' }, { status: 400 });
    }

    // Usually BackupService.backupDir, assuming 'backups' here.
    const targetPath = join(process.cwd(), 'backups', filename);

    // Verify existence
    const fileStat = await stat(targetPath);
    
    logger.info(`Admin ${user.id} is downloading backup file: ${filename}`);

    // Create readable stream for the browser
    const fileStream = createReadStream(targetPath);

    return new Response(fileStream as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream', // Raw encrypted blob
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Content-Length': fileStat.size.toString(),
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error) {
    logger.error('Failed to download backup file', undefined, error as Error);
    return json({ error: 'File not found or internal server error' }, { status: 500 });
  }
};
