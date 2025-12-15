import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetPasswords() {
  try {
    const defaultPassword = 'password123'; // Password default untuk semua akun
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Reset ADMIN password
    const admin = await prisma.user.update({
      where: { email: 'admin@lms.com' },
      data: { password: hashedPassword },
    });
    console.log('✅ ADMIN password reset:', admin.email);

    // Reset TEACHER password
    const teacher = await prisma.user.update({
      where: { email: 'teacher@lms.com' },
      data: { password: hashedPassword },
    });
    console.log('✅ TEACHER password reset:', teacher.email);

    // Reset STUDENT password
    const student = await prisma.user.update({
      where: { email: 'student@lms.com' },
      data: { password: hashedPassword },
    });
    console.log('✅ STUDENT password reset:', student.email);

    console.log('\n🎉 All passwords have been reset!');
    console.log('📧 Email: admin@lms.com / teacher@lms.com / student@lms.com');
    console.log('🔑 Password: password123');

  } catch (error) {
    console.error('❌ Error resetting passwords:', error);
    if (error.code === 'P2025') {
      console.error('⚠️  User not found. Make sure the users exist in the database.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

resetPasswords();


