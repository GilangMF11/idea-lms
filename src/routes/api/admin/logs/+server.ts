import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { getAuthUser, requireAdmin, apiError } from '$lib/api-utils.js';

export const GET: RequestHandler = async ({ request, url }) => {
  try {
    const user = getAuthUser(request);
    requireAdmin(user);

    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    const level = url.searchParams.get('level') || '';
    const search = url.searchParams.get('search') || '';

    const whereClause: any = {};
    if (level) {
      whereClause.level = level;
    }
    if (search) {
      whereClause.OR = [
        { message: { contains: search } },
        { context: { contains: search } }
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.systemLog.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.systemLog.count({ where: whereClause })
    ]);

    return json({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return apiError(error);
  }
};
