import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { notificationService } from '$lib/notifications.js';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';

export const GET: RequestHandler = async ({ request, url }: { request: any; url: any }) => {
  try {
    const user = getAuthUser(request);

    const limit = parseInt(url.searchParams.get('limit') || '50');

    const notifications = await notificationService.getUserNotifications(user.id, limit);
    const unreadCount = await notificationService.getUnreadCount(user.id);

    return json({ notifications, unreadCount });
  } catch (error) {
    return apiError(error);
  }
};

export const PATCH: RequestHandler = async ({ request, url }) => {
  try {
    const user = getAuthUser(request);

    const notificationId = url.searchParams.get('id');
    const action = url.searchParams.get('action');

    if (action === 'markAllRead') {
      await notificationService.markAllAsRead(user.id);
      return json({ message: 'All notifications marked as read' });
    }

    if (notificationId && action === 'markRead') {
      await notificationService.markAsRead(notificationId, user.id);
      return json({ message: 'Notification marked as read' });
    }

    return json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return apiError(error);
  }
};
