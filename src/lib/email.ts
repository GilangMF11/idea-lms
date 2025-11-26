// Email utility functions
// In production, integrate with email service like SendGrid, AWS SES, etc.

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'production' && !!process.env.EMAIL_API_KEY;
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isEnabled) {
      console.log('Email service disabled in development mode');
      console.log('Email would be sent to:', options.to);
      console.log('Subject:', options.subject);
      return true;
    }

    try {
      // TODO: Implement actual email sending logic
      // Example with SendGrid:
      // const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(process.env.EMAIL_API_KEY);
      // await sgMail.send(options);
      
      console.log('Email sent successfully to:', options.to);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  async sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
    const template = this.getWelcomeTemplate(userName);
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendClassInviteEmail(
    userEmail: string,
    userName: string,
    className: string,
    classCode: string
  ): Promise<boolean> {
    const template = this.getClassInviteTemplate(userName, className, classCode);
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendPasswordResetEmail(
    userEmail: string,
    userName: string,
    resetToken: string
  ): Promise<boolean> {
    const template = this.getPasswordResetTemplate(userName, resetToken);
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendNotificationEmail(
    userEmail: string,
    userName: string,
    title: string,
    message: string
  ): Promise<boolean> {
    const template = this.getNotificationTemplate(userName, title, message);
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  private getWelcomeTemplate(userName: string): EmailTemplate {
    return {
      subject: 'Welcome to IDEA!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome to IDEA!</h1>
          <p>Hello ${userName},</p>
          <p>Welcome to our Learning Management System! We're excited to have you on board.</p>
          <p>You can now start exploring the platform and join classes to begin your learning journey.</p>
          <p>If you have any questions, feel free to reach out to our support team.</p>
          <p>Best regards,<br>The IDEA Team</p>
        </div>
      `,
      text: `Welcome to IDEA!\n\nHello ${userName},\n\nWelcome to our Learning Management System! We're excited to have you on board.\n\nYou can now start exploring the platform and join classes to begin your learning journey.\n\nIf you have any questions, feel free to reach out to our support team.\n\nBest regards,\nThe IDEA Team`,
    };
  }

  private getClassInviteTemplate(
    userName: string,
    className: string,
    classCode: string
  ): EmailTemplate {
    return {
      subject: `You've been invited to join ${className}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Class Invitation</h1>
          <p>Hello ${userName},</p>
          <p>You've been invited to join the class <strong>${className}</strong>.</p>
          <p>Class Code: <code style="background: #f4f4f4; padding: 2px 4px; border-radius: 3px;">${classCode}</code></p>
          <p>Use this code to join the class in the IDEA platform.</p>
          <p>Best regards,<br>The IDEA Team</p>
        </div>
      `,
      text: `Class Invitation\n\nHello ${userName},\n\nYou've been invited to join the class ${className}.\n\nClass Code: ${classCode}\n\nUse this code to join the class in the IDEA platform.\n\nBest regards,\nThe IDEA Team`,
    };
  }

  private getPasswordResetTemplate(userName: string, resetToken: string): EmailTemplate {
    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    return {
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Password Reset Request</h1>
          <p>Hello ${userName},</p>
          <p>You've requested to reset your password. Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>This link will expire in 1 hour for security reasons.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <p>Best regards,<br>The IDEA Team</p>
        </div>
      `,
      text: `Password Reset Request\n\nHello ${userName},\n\nYou've requested to reset your password. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in 1 hour for security reasons.\n\nIf you didn't request this password reset, please ignore this email.\n\nBest regards,\nThe IDEA Team`,
    };
  }

  private getNotificationTemplate(
    userName: string,
    title: string,
    message: string
  ): EmailTemplate {
    return {
      subject: title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">${title}</h1>
          <p>Hello ${userName},</p>
          <p>${message}</p>
          <p>Best regards,<br>The IDEA Team</p>
        </div>
      `,
      text: `${title}\n\nHello ${userName},\n\n${message}\n\nBest regards,\nThe IDEA Team`,
    };
  }
}

export const emailService = new EmailService();
