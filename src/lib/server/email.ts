import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Configuration from environment variables
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@lms-light.com';
const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:5173';

/**
 * Creates a configured Nodemailer transport.
 * It uses OAuth2 if GOOGLE_REFRESH_TOKEN is provided, otherwise it falls back to standard SMTP_PASS.
 */
function createTransport() {
  if (!SMTP_USER) {
    console.warn('SMTP_USER is not defined. Emails will not be sent.');
    return null;
  }

  // Use OAuth2 if a refresh token is provided
  if (GOOGLE_REFRESH_TOKEN && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: SMTP_USER,
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        refreshToken: GOOGLE_REFRESH_TOKEN,
      },
    });
  }

  // Fallback to App Password
  if (SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }

  console.warn('No GOOGLE_REFRESH_TOKEN or SMTP_PASS provided for email configuration.');
  return null;
}

const transporter = createTransport();

/**
 * Generates a secure random verification token.
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Sends a verification email to the user.
 * 
 * @param to - The recipient email address
 * @param token - The verification token
 * @param name - The user's name (optional, for personalization)
 */
export async function sendVerificationEmail(to: string, token: string, name: string = 'User') {
  if (!transporter) {
    console.error('Email transporter is not configured. Could not send verification email to', to);
    // In development without email configured, you might want to log the verification link
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Verification Link for ${to}: ${PUBLIC_URL}/verify-email?token=${token}`);
    }
    return false;
  }

  const verifyUrl = `${PUBLIC_URL}/verify-email?token=${token}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #1e3a8a;">Welcome to IDEA LMS, ${name}!</h2>
      <p style="color: #334155; font-size: 16px; line-height: 1.5;">
        Thank you for registering. To complete your setup and secure your account, please verify your email address by clicking the button below.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
          Verify Email Address
        </a>
      </div>
      <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
        If the button above doesn't work, you can copy and paste the following link into your browser:
        <br>
        <a href="${verifyUrl}" style="color: #2563eb; word-break: break-all;">${verifyUrl}</a>
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">
        If you didn't create an account, you can safely ignore this email. This link will expire in 24 hours.
      </p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"IDEA LMS" <${SMTP_FROM}>`,
      to,
      subject: 'Verify your email address - IDEA LMS',
      html: htmlContent,
    });
    console.log(`Verification email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
}

/**
 * Sends a password reset email to the user.
 * 
 * @param to - The recipient email address
 * @param token - The reset token
 * @param name - The user's name (optional, for personalization)
 */
export async function sendPasswordResetEmail(to: string, token: string, name: string = 'User') {
  if (!transporter) {
    console.error('Email transporter is not configured. Could not send password reset email to', to);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Password Reset Link for ${to}: ${PUBLIC_URL}/reset-password?token=${token}`);
    }
    return false;
  }

  const resetUrl = `${PUBLIC_URL}/reset-password?token=${token}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #1e3a8a;">Password Reset Request</h2>
      <p style="color: #334155; font-size: 16px; line-height: 1.5;">
        Hi ${name},
        <br><br>
        We received a request to reset your password for your IDEA LMS account. Click the button below to choose a new password.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
        If the button above doesn't work, you can copy and paste the following link into your browser:
        <br>
        <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">
        If you didn't request a password reset, you can safely ignore this email. This link will expire in 1 hour.
      </p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"IDEA LMS" <${SMTP_FROM}>`,
      to,
      subject: 'Reset your password - IDEA LMS',
      html: htmlContent,
    });
    console.log(`Password reset email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}
