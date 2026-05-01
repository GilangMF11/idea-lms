import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { verifyToken } from '$lib/auth.js';
import { backupService } from '$lib/backup.js';
import { logger } from '$lib/logger.js';

/**
 * Custom JSON replacer to handle BigInt serialization
 * and avoid TypeError: Do not know how to serialize a BigInt
 */
function replacer(key: string, value: any) {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}

export const GET: RequestHandler = async ({ request }) => {
  try {
    // 1. Input Validation / Header check
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      logger.warn('Backup attempted without valid Authorization header');
      return json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }

    // 2. Authentication & Authorization check
    const token = authHeader.substring(7);
    const user = verifyToken(token);
    
    if (!user || user.role !== 'ADMIN') {
      logger.warn(`Unauthorized backup attempt by user: ${user?.id || 'Unknown'}`);
      return json({ error: 'Forbidden: Only administrators can access backups' }, { status: 403 });
    }

    logger.info(`Starting database backup generation requested by admin: ${user.id}`);

    // 3. Backup Processing via Reusable Service
    const backupData = await backupService.generateBackupData();

    // 4. Data Transformation
    const jsonString = JSON.stringify(backupData, replacer);

    logger.info(`Successfully generated database backup for admin: ${user.id}`);

    // 5. Response Building with Security Headers
    const filename = `backup-${new Date().toISOString().split('T')[0]}.json`;
    
    return new Response(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    // 6. Error Handling & Secure Error Reporting
    logger.error('Critical error during database backup generation', undefined, error as Error);
    return json(
      { error: 'Internal server error during backup generation. Please check server logs.' }, 
      { status: 500 }
    );
  }
};
