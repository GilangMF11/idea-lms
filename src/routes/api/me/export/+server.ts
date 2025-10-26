import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { exportService } from '$lib/export.js';
import { verifyToken } from '$lib/auth.js';

export const POST: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (!user) {
      return json({ error: 'Invalid token' }, { status: 401 });
    }

    const { format, includeData } = await request.json();

    if (!format || !includeData) {
      return json({ error: 'Format and includeData are required' }, { status: 400 });
    }

    const exportData = await exportService.exportUserData(user.id, { format, includeData });

    return json({ data: exportData });
  } catch (error) {
    console.error('Export user data error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
