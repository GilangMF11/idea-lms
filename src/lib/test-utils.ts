import { prisma } from './database.js';
import { hashPassword } from './auth.js';
// import type { UserRole } from '@prisma/client';

export async function createTestUser(data: {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'STUDENT' | 'TEACHER' | 'ADMIN';
}) {
  const hashedPassword = await hashPassword(data.password);
  
  return prisma.user.create({
    data: {
      ...data,
      password: hashedPassword,
      role: data.role || 'STUDENT',
    },
  });
}

export async function createTestClass(data: {
  name: string;
  description?: string;
  code: string;
  teacherId: string;
}) {
  return prisma.class.create({
    data,
  });
}

export async function createTestReadingText(data: {
  title: string;
  content: string;
  classId: string;
  author?: string;
  source?: string;
}) {
  return prisma.readingText.create({
    data,
  });
}

export async function createTestWritingDraft(data: {
  title: string;
  content: string;
  userId: string;
  classId: string;
  outlineId?: string;
}) {
  return prisma.writingDraft.create({
    data,
  });
}

export async function createTestAnnotation(data: {
  readingTextId: string;
  userId: string;
  classId: string;
  content: string;
  startPos: number;
  endPos: number;
  color?: string;
  isPublic?: boolean;
}) {
  return prisma.annotation.create({
    data,
  });
}

export async function createTestPeerReview(data: {
  draftId: string;
  reviewerId: string;
  classId: string;
  type: 'PERSUASIVE' | 'INTERACTIVE';
  comment: string;
  rating?: number;
  isPositive?: boolean;
}) {
  return prisma.peerReview.create({
    data,
  });
}

export async function createTestRevision(data: {
  draftId: string;
  userId: string;
  classId: string;
  content: string;
  feedback?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FINISHED';
}) {
  return prisma.revision.create({
    data,
  });
}

export async function createTestExercise(data: {
  title: string;
  description?: string;
  content: string;
  type: 'INDIVIDUAL' | 'GROUP';
  classId: string;
  readingTextId?: string;
  dueDate?: Date;
}) {
  return prisma.exercise.create({
    data,
  });
}

export async function createTestExerciseSubmission(data: {
  exerciseId: string;
  userId: string;
  answer: string;
  score?: number;
  feedback?: string;
}) {
  return prisma.exerciseSubmission.create({
    data,
  });
}

export async function createTestChatMessage(data: {
  classId: string;
  userId: string;
  content: string;
}) {
  return prisma.chatMessage.create({
    data,
  });
}

export async function createTestWritingOutline(data: {
  title: string;
  content: string;
  userId: string;
  classId: string;
}) {
  return prisma.writingOutline.create({
    data,
  });
}

export async function createTestFinalProduct(data: {
  title: string;
  content: string;
  draftId: string;
  userId: string;
  classId: string;
}) {
  return prisma.finalProduct.create({
    data,
  });
}

export async function cleanupTestData() {
  // Delete in reverse order of dependencies
  await prisma.history.deleteMany();
  await prisma.finalProduct.deleteMany();
  await prisma.revisionComment.deleteMany();
  await prisma.revision.deleteMany();
  await prisma.peerReview.deleteMany();
  await prisma.writingDraft.deleteMany();
  await prisma.writingOutline.deleteMany();
  await prisma.exerciseSubmission.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.annotation.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.readingText.deleteMany();
  await prisma.classStudent.deleteMany();
  await prisma.class.deleteMany();
  await prisma.user.deleteMany();
}

export async function seedTestData() {
  // Create test users
  const admin = await createTestUser({
    email: 'admin@test.com',
    username: 'admin',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'User',
    role: 'ADMIN',
  });

  const teacher = await createTestUser({
    email: 'teacher@test.com',
    username: 'teacher',
    password: 'teacher123',
    firstName: 'John',
    lastName: 'Teacher',
    role: 'TEACHER',
  });

  const student = await createTestUser({
    email: 'student@test.com',
    username: 'student',
    password: 'student123',
    firstName: 'Jane',
    lastName: 'Student',
    role: 'STUDENT',
  });

  // Create test class
  const testClass = await createTestClass({
    name: 'Test Class',
    description: 'A test class for development',
    code: 'TEST001',
    teacherId: teacher.id,
  });

  // Add student to class
  await prisma.classStudent.create({
    data: {
      classId: testClass.id,
      studentId: student.id,
    },
  });

  // Create test reading text
  const readingText = await createTestReadingText({
    title: 'Sample Reading Text',
    content: 'This is a sample reading text for testing purposes.',
    classId: testClass.id,
    author: 'Test Author',
    source: 'Test Source',
  });

  // Create test writing outline
  const outline = await createTestWritingOutline({
    title: 'Sample Outline',
    content: JSON.stringify({
      nodes: [
        { id: '1', text: 'Introduction' },
        { id: '2', text: 'Main Points' },
        { id: '3', text: 'Conclusion' },
      ],
      edges: [
        { from: '1', to: '2' },
        { from: '2', to: '3' },
      ],
    }),
    userId: student.id,
    classId: testClass.id,
  });

  // Create test writing draft
  const draft = await createTestWritingDraft({
    title: 'Sample Draft',
    content: 'This is a sample writing draft.',
    userId: student.id,
    classId: testClass.id,
    outlineId: outline.id,
  });

  return {
    admin,
    teacher,
    student,
    testClass,
    readingText,
    outline,
    draft,
  };
}
