import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createLoginData() {
  try {
    // Create ADMIN user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@lms.com' },
      update: {},
      create: {
        email: 'admin@lms.com',
        username: 'admin',
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        isActive: true,
      },
    });

    // Create TEACHER user
    const teacherPassword = await bcrypt.hash('teacher123', 10);
    const teacher = await prisma.user.upsert({
      where: { email: 'teacher@lms.com' },
      update: {},
      create: {
        email: 'teacher@lms.com',
        username: 'teacher',
        password: teacherPassword,
        firstName: 'John',
        lastName: 'Teacher',
        role: 'TEACHER',
        isActive: true,
      },
    });

    // Create STUDENT user
    const studentPassword = await bcrypt.hash('student123', 10);
    const student = await prisma.user.upsert({
      where: { email: 'student@lms.com' },
      update: {},
      create: {
        email: 'student@lms.com',
        username: 'student',
        password: studentPassword,
        firstName: 'Jane',
        lastName: 'Student',
        role: 'STUDENT',
        isActive: true,
      },
    });

    // Create class with teacher
    const classData = await prisma.class.upsert({
      where: { code: 'MATH101' },
      update: {},
      create: {
        name: 'Mathematics 101',
        description: 'Basic mathematics course',
        code: 'MATH101',
        teacherId: teacher.id,
        isActive: true,
      },
    });

    // Add student to class
    await prisma.classStudent.upsert({
      where: {
        classId_studentId: {
          classId: classData.id,
          studentId: student.id,
        },
      },
      update: {},
      create: {
        classId: classData.id,
        studentId: student.id,
      },
    });

    // Create reading text
    const readingText = await prisma.readingText.create({
      data: {
        title: 'Introduction to Algebra',
        content: '<p>Algebra is a branch of mathematics that deals with symbols and the rules for manipulating these symbols.</p><p>In algebra, we use letters to represent numbers, and we can solve equations to find the values of these letters.</p>',
        classId: classData.id,
        author: 'Mathematics Department',
        source: 'Textbook Chapter 1',
      },
    });

    // Create annotation
    const annotation = await prisma.annotation.create({
      data: {
        readingTextId: readingText.id,
        userId: teacher.id,
        classId: classData.id,
        content: 'This is an important concept that students should understand well.',
        selectedText: 'Algebra is a branch of mathematics',
        startPos: 0,
        endPos: 35,
        isPublic: true,
      },
    });

    console.log('✅ Login data created successfully!');
    console.log('👑 ADMIN:', 'admin@lms.com / admin123');
    console.log('👨‍🏫 TEACHER:', 'teacher@lms.com / teacher123');
    console.log('👨‍🎓 STUDENT:', 'student@lms.com / student123');
    console.log('📚 Class ID:', classData.id);
    console.log('📖 Reading Text ID:', readingText.id);
    console.log('💬 Annotation ID:', annotation.id);

  } catch (error) {
    console.error('❌ Error creating login data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createLoginData();
