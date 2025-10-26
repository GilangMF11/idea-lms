import { prisma } from './database.js';

export interface HistoryData {
  tableName: string;
  recordId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  oldData?: any;
  newData?: any;
  userId?: string;
  classId?: string;
}

export async function createHistory(data: HistoryData) {
  try {
    await prisma.history.create({
      data: {
        tableName: data.tableName,
        recordId: data.recordId,
        action: data.action,
        oldData: data.oldData ? JSON.stringify(data.oldData) : null,
        newData: data.newData ? JSON.stringify(data.newData) : null,
        userId: data.userId,
        classId: data.classId,
      },
    });
  } catch (error) {
    console.error('Failed to create history record:', error);
  }
}

export async function getHistoryByRecord(tableName: string, recordId: string) {
  return prisma.history.findMany({
    where: {
      tableName,
      recordId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
}

export async function getHistoryByClass(classId: string, limit: number = 50) {
  return prisma.history.findMany({
    where: {
      classId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
}
