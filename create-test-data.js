import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestData() {
  try {
    // Get existing user and class
    const user = await prisma.user.findFirst();
    const classData = await prisma.class.findFirst();

    if (!user || !classData) {
      console.log('No user or class found');
      return;
    }

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

    console.log('Test data created successfully!');
    console.log('Reading Text ID:', readingText.id);
    console.log('Annotation ID:', annotation.id);
    console.log('Class ID:', classData.id);
  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();
