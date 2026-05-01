import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { exportService } from '$lib/export.js';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';

export const POST: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const user = getAuthUser(request);

    const { format, includeData } = await request.json();

    if (!format || !includeData) {
      return json({ error: 'Format and includeData are required' }, { status: 400 });
    }

    const exportData = await exportService.exportUserData(user.id, { format, includeData });

    return json({ data: exportData });
  } catch (error) {
    return apiError(error);
  }
};
