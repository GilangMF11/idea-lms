import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-here';

async function createToken() {
  try {
    const user = await prisma.user.findFirst();
    
    if (!user) {
      console.log('No user found');
      return;
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('Token created for user:', user.id);
    console.log('Token:', token);
    
    // Test token verification
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Token verified successfully:', decoded);
  } catch (error) {
    console.error('Error creating token:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createToken();
