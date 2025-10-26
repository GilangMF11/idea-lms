import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { notificationService } from '$lib/notifications.js';
import { verifyToken } from '$lib/auth.js';

export const GET: RequestHandler = async ({ request, url }: { request: any; url: any }) => {
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

    const limit = parseInt(url.searchParams.get('limit') || '50');

    const notifications = await notificationService.getUserNotifications(user.id, limit);
    const unreadCount = await notificationService.getUnreadCount(user.id);

    return json({ notifications, unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const PATCH: RequestHandler = async ({ request, url }) => {
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
    console.error('Update notification error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
