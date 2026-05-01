import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { monitoringService } from '$lib/monitoring.js';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';

export const GET: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const user = getAuthUser(request);
    requireAdmin(user);

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
    return apiError(error);
  }
};
