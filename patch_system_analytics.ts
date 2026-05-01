import fs from 'fs';

let content = fs.readFileSync('src/lib/analytics.ts', 'utf-8');

// Step 1: Add recentActivity to SystemAnalytics type if missing or ensure it's there
// Wait, we need to add recentActivity to getSystemAnalytics return type
content = content.replace('activeUsers: number;', `activeUsers: number;\n    recentActivity: Array<{type: string, title: string, timestamp: Date, user: string}>;`);

// Step 2: Add this.getSystemRecentActivity() to Promise.all
content = content.replace('this.getActiveUsers(),', `this.getActiveUsers(),\n      this.getSystemRecentActivity(),`);

// Step 3: Add recentActivity variable
content = content.replace('activeUsers,', `activeUsers,\n      recentActivity,`);

// Step 4: Add getSystemRecentActivity method
const systemRecentActivityMethod = `
  private async getSystemRecentActivity(): Promise<Array<{
    type: string;
    title: string;
    timestamp: Date;
    user: string;
  }>> {
    const activities = [];
    const classRecords = await prisma.class.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { teacher: true }});
    activities.push(...classRecords.map(c => ({
      type: 'class', title: 'New class: ' + c.name, timestamp: c.createdAt, user: c.teacher?.firstName + ' ' + c.teacher?.lastName
    })));
    
    const userRecords = await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5 });
    activities.push(...userRecords.map(u => ({
      type: 'user', title: 'New user joined', timestamp: u.createdAt, user: u.firstName + ' ' + u.lastName
    })));

    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);
  }
`;
content = content.replace('private async getActiveUsers(): Promise<number> {', systemRecentActivityMethod + '\n  private async getActiveUsers(): Promise<number> {');

fs.writeFileSync('src/lib/analytics.ts', content);
