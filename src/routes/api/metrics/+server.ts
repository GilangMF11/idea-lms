import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { monitoringService } from '$lib/monitoring.js';
import { verifyToken } from '$lib/auth.js';

export const GET: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (!user || user.role !== 'ADMIN') {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    const [metrics, dbStats, recentActivity] = await Promise.all([
      monitoringService.getSystemMetrics(),
      monitoringService.getDatabaseStats(),
      monitoringService.getRecentActivity(),
    ]);

    return json({
      metrics,
      databaseStats: dbStats,
      recentActivity,
    });
  } catch (error) {
    console.error('Metrics error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
