import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  try {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        username: 'testuser',
        password: '$2a$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJByJp8Y2v8K8K8K8K8', // password: test123
        firstName: 'Test',
        lastName: 'User',
        role: 'STUDENT',
        isActive: true,
      },
    });

    // Create test class
    const classData = await prisma.class.create({
      data: {
        name: 'Test Class',
        description: 'Test class for testing',
        code: 'TEST001',
        teacherId: user.id,
        isActive: true,
      },
    });

    // Create test reading text
    const readingText = await prisma.readingText.create({
      data: {
        title: 'Test Reading Text',
        content: '<p>This is a test reading text.</p>',
        classId: classData.id,
      },
    });

    // Create test annotation
    const annotation = await prisma.annotation.create({
      data: {
        readingTextId: readingText.id,
        userId: user.id,
        classId: classData.id,
        content: 'This is a test annotation',
        selectedText: 'test reading text',
        startPos: 0,
        endPos: 20,
        isPublic: true,
      },
    });

    console.log('Seed data created successfully!');
    console.log('User ID:', user.id);
    console.log('Class ID:', classData.id);
    console.log('Reading Text ID:', readingText.id);
    console.log('Annotation ID:', annotation.id);
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
