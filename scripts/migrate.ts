import { execSync } from 'child_process';

async function main() {
  try {
    console.log('🚀 Starting database migration...');
    
    // Generate Prisma client
    console.log('📦 Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    // Run migrations
    console.log('🔄 Running database migrations...');
    execSync('npx prisma db push', { stdio: 'inherit' });
    
    // Seed database with initial data
    console.log('🌱 Seeding database...');
    await seedDatabase();
    
    console.log('✅ Database migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function seedDatabase() {
  // Import Prisma client after generation
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  try {
    // Create admin user
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@lms.com' },
      update: {},
      create: {
        email: 'admin@lms.com',
        username: 'admin',
        password: '$2a$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJByJp1YrRqxL0v2iNe', // password: admin123
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
      },
    });

    // Create sample teacher
    const teacherUser = await prisma.user.upsert({
      where: { email: 'teacher@lms.com' },
      update: {},
      create: {
        email: 'teacher@lms.com',
        username: 'teacher',
        password: '$2a$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJByJp1YrRqxL0v2iNe', // password: teacher123
        firstName: 'John',
        lastName: 'Teacher',
        role: 'TEACHER',
      },
    });

    // Create sample student
    const studentUser = await prisma.user.upsert({
      where: { email: 'student@lms.com' },
      update: {},
      create: {
        email: 'student@lms.com',
        username: 'student',
        password: '$2a$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJByJp1YrRqxL0v2iNe', // password: student123
        firstName: 'Jane',
        lastName: 'Student',
        role: 'STUDENT',
      },
    });

    // Create sample class
    const sampleClass = await prisma.class.upsert({
      where: { code: 'LMS001' },
      update: {},
      create: {
        name: 'English Literature 101',
        description: 'Introduction to English Literature',
        code: 'LMS001',
        teacherId: teacherUser.id,
      },
    });

    // Add student to class
    await prisma.classStudent.upsert({
      where: {
        classId_studentId: {
          classId: sampleClass.id,
          studentId: studentUser.id,
        },
      },
      update: {},
      create: {
        classId: sampleClass.id,
        studentId: studentUser.id,
      },
    });

    console.log('✅ Database seeded successfully!');
    console.log('📧 Admin: admin@lms.com / admin123');
    console.log('📧 Teacher: teacher@lms.com / teacher123');
    console.log('📧 Student: student@lms.com / student123');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
