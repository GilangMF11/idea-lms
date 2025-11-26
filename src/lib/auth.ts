import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from './database.js';
import { config } from './config.js';
// import type { User } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-here';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
}

export function isProfileComplete(user: {
  phoneNumber?: string | null;
  institution?: string | null;
  program?: string | null;
  semester?: number | null;
  province?: string | null;
  city?: string | null;
}): boolean {
  // Check that all required fields are present and not empty
  const hasPhoneNumber = user.phoneNumber && typeof user.phoneNumber === 'string' && user.phoneNumber.trim() !== '';
  const hasInstitution = user.institution && typeof user.institution === 'string' && user.institution.trim() !== '';
  const hasProgram = user.program && typeof user.program === 'string' && user.program.trim() !== '';
  const hasSemester = user.semester && typeof user.semester === 'number' && user.semester > 0;
  const hasProvince = user.province && typeof user.province === 'string' && user.province.trim() !== '';
  const hasCity = user.city && typeof user.city === 'string' && user.city.trim() !== '';
  
  return !!(hasPhoneNumber && hasInstitution && hasProgram && hasSemester && hasProvince && hasCity);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      role: decoded.role,
    };
  } catch (error) {
    return null;
  }
}

export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.isActive) {
    return null;
  }

  // If user has no password (OAuth user), they can't login with email/password
  if (!user.password) {
    return null;
  }

  const isValidPassword = await verifyPassword(password, user.password);
  if (!isValidPassword) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}

export async function createUser(userData: {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'STUDENT' | 'TEACHER' | 'ADMIN';
  phoneNumber?: string;
  institution?: string;
  program?: string;
  semester?: number;
  province?: string;
  city?: string;
  googleId?: string;
}): Promise<AuthUser> {
  const hashedPassword = userData.password ? await hashPassword(userData.password) : null;
  
  const user = await prisma.user.create({
    data: {
      email: userData.email,
      username: userData.username,
      password: hashedPassword as any, // Type assertion needed until Prisma types are regenerated
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role || 'STUDENT',
      phoneNumber: userData.phoneNumber,
      institution: userData.institution,
      program: userData.program,
      semester: userData.semester,
      province: userData.province,
      city: userData.city,
      googleId: userData.googleId as any, // Type assertion needed until Prisma types are regenerated
    } as any,
  });

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}

export async function authenticateWithGoogle(googleToken: string): Promise<AuthUser | null> {
  try {
    // Verify Google token and get user info
    const response = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${googleToken}`);
    
    if (!response.ok) {
      return null;
    }

    const googleUser = await response.json();
    
    if (!googleUser.email || !googleUser.sub) {
      return null;
    }

    // Check if user exists with this Google ID
    let user = await prisma.user.findFirst({
      where: { googleId: googleUser.sub } as any, // Type assertion needed until Prisma types are regenerated
    });

    // If not found by Google ID, check by email to link existing account
    if (!user) {
      user = await prisma.user.findUnique({
        where: { email: googleUser.email },
      });

      // If user exists with email but no Google ID, link the Google account
      if (user && !(user as any).googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { 
            googleId: googleUser.sub as any, // Type assertion needed until Prisma types are regenerated
            // Update avatar if available from Google
            ...(googleUser.picture && { avatar: googleUser.picture }),
          } as any,
        });
      }
      // If user exists with email but has different Google ID, don't allow login
      // (This prevents account hijacking)
      else if (user && (user as any).googleId && (user as any).googleId !== googleUser.sub) {
        console.warn(`User ${user.email} already linked to different Google account`);
        return null;
      }
    }

    // If user doesn't exist, create new user
    if (!user) {
      // Generate username from email
      const username = googleUser.email.split('@')[0] + '_' + Math.random().toString(36).substring(2, 8);
      
      // Split name
      const nameParts = (googleUser.name || googleUser.email.split('@')[0]).split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          username,
          password: null as any, // No password for OAuth users - Type assertion needed
          firstName,
          lastName,
          googleId: googleUser.sub as any, // Type assertion needed until Prisma types are regenerated
          avatar: googleUser.picture,
          role: 'STUDENT',
        } as any,
      });
    }

    if (!user.isActive) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  } catch (error) {
    console.error('Google authentication error:', error);
    return null;
  }
}

export function getGoogleAuthUrl(): string {
  const { clientId, redirectUri } = config.auth.google;
  const scope = 'openid email profile';
  const responseType = 'code';
  const accessType = 'offline';
  const prompt = 'consent';
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: responseType,
    scope,
    access_type: accessType,
    prompt,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function getGoogleToken(code: string): Promise<string | null> {
  try {
    const { clientId, clientSecret, redirectUri } = config.auth.google;
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.id_token || null;
  } catch (error) {
    console.error('Error getting Google token:', error);
    return null;
  }
}
