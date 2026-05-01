  private async getSystemActivityTrends(): Promise<number[]> {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [users, classes] = await Promise.all([
      prisma.user.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, select: { createdAt: true } }),
      prisma.class.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, select: { createdAt: true } })
    ]);

    [...users, ...classes].forEach(item => {
      const diffTime = Math.abs(today.getTime() - item.createdAt.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 7) counts[6 - diffDays]++;
    });
    return counts;
  }
