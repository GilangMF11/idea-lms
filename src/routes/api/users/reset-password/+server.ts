import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/database.js';
import { getAuthUser, apiError, requireAdmin } from '$lib/api-utils.js';
import { hashPassword } from '$lib/auth.js';
import { createHistory } from '$lib/history.js';

/**
 * Admin-only endpoint to reset a user's password.
 * POST /api/users/reset-password
 * Body: { userId: string, newPassword: string }
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const user = getAuthUser(request);
    requireAdmin(user);

    const { userId, newPassword } = await request.json();

    if (!userId) {
      return json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!newPassword || newPassword.length < 6) {
      return json({ error: 'New password must be at least 6 characters' }, { status: 400 });
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, username: true },
    });

    if (!targetUser) {
      return json({ error: 'User not found' }, { status: 404 });
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user's password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Create history record
    await createHistory({
      tableName: 'users',
      recordId: userId,
      action: 'UPDATE',
      oldData: { note: 'Password reset by admin' },
      newData: { note: 'Password was reset' },
      userId: user.id,
    });

    return json({ 
      success: true, 
      message: `Password for ${targetUser.firstName} ${targetUser.lastName} has been reset successfully` 
    });
  } catch (error) {
    return apiError(error);
  }
};
