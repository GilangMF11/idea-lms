import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { monitoringService } from '$lib/monitoring.js';

export const GET: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const startTime = Date.now();
    const healthCheck = await monitoringService.healthCheck();
    const responseTime = Date.now() - startTime;

    // Record the health check request
    monitoringService.recordRequest(responseTime, healthCheck.status === 'unhealthy');

    const statusCode = healthCheck.status === 'healthy' ? 200 : 
                      healthCheck.status === 'degraded' ? 200 : 503;

    return json(healthCheck, { status: statusCode });
  } catch (error) {
    console.error('Health check error:', error);
    return json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: {
          database: { status: 'fail', message: 'Health check failed' },
          memory: { status: 'fail', message: 'Health check failed' },
          disk: { status: 'fail', message: 'Health check failed' },
          api: { status: 'fail', message: 'Health check failed' },
        },
        uptime: 0,
        version: '1.0.0',
      },
      { status: 503 }
    );
  }
};
