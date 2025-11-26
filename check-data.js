import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  try {
    const users = await prisma.user.findMany();
    const classes = await prisma.class.findMany();
    const readingTexts = await prisma.readingText.findMany();
    const annotations = await prisma.annotation.findMany();
    const chatMessages = await prisma.chatMessage.findMany();

    console.log('Users:', users.length);
    console.log('Classes:', classes.length);
    console.log('Reading Texts:', readingTexts.length);
    console.log('Annotations:', annotations.length);
    console.log('Chat Messages:', chatMessages.length);

    if (users.length > 0) {
      console.log('First user:', users[0]);
    }
    if (classes.length > 0) {
      console.log('First class:', classes[0]);
    }
    if (annotations.length > 0) {
      console.log('First annotation:', annotations[0]);
    }
  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();