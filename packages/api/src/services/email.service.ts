export interface EmailService {
  sendVerificationEmail(email: string, token: string): Promise<void>;
  sendPasswordResetEmail(email: string, token: string, firstName: string): Promise<void>;
}

/**
 * Mock email service for development
 * In production, this would integrate with services like SendGrid, AWS SES, etc.
 */
export class MockEmailService implements EmailService {
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    
    console.log('📧 Email Verification');
    console.log(`To: ${email}`);
    console.log(`Subject: Verify your StepFlow account`);
    console.log(`Verification URL: ${verificationUrl}`);
    console.log('---');
    
    // In production, send actual email here
    // await this.sendEmail({
    //   to: email,
    //   subject: 'Verify your StepFlow account',
    //   html: this.getVerificationEmailTemplate(verificationUrl)
    // });
  }

  async sendPasswordResetEmail(email: string, token: string, firstName: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    
    console.log('📧 Password Reset');
    console.log(`To: ${email}`);
    console.log(`Subject: Reset your StepFlow password`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log(`First Name: ${firstName}`);
    console.log('---');
    
    // In production, send actual email here
    // await this.sendEmail({
    //   to: email,
    //   subject: 'Reset your StepFlow password',
    //   html: this.getPasswordResetEmailTemplate(resetUrl, firstName)
    // });
  }

  private getVerificationEmailTemplate(verificationUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify your StepFlow account</title>
      </head>
      <body>
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h1 style="color: #333;">Welcome to StepFlow!</h1>
          <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
          <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
            Verify Email Address
          </a>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">
            If you didn't create a StepFlow account, you can safely ignore this email.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  private getPasswordResetEmailTemplate(resetUrl: string, firstName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset your StepFlow password</title>
      </head>
      <body>
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h1 style="color: #333;">Password Reset Request</h1>
          <p>Hi ${firstName},</p>
          <p>We received a request to reset your StepFlow password. Click the button below to create a new password:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
            Reset Password
          </a>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">
            If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
          </p>
        </div>
      </body>
      </html>
    `;
  }
}

/**
 * Production email service using SendGrid (example)
 * Uncomment and configure when ready for production
 */
// import sgMail from '@sendgrid/mail';
// 
// export class SendGridEmailService implements EmailService {
//   constructor() {
//     sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
//   }
// 
//   async sendVerificationEmail(email: string, token: string): Promise<void> {
//     const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
//     
//     const msg = {
//       to: email,
//       from: process.env.FROM_EMAIL!,
//       subject: 'Verify your StepFlow account',
//       html: this.getVerificationEmailTemplate(verificationUrl),
//     };
// 
//     await sgMail.send(msg);
//   }
// 
//   async sendPasswordResetEmail(email: string, token: string, firstName: string): Promise<void> {
//     const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
//     
//     const msg = {
//       to: email,
//       from: process.env.FROM_EMAIL!,
//       subject: 'Reset your StepFlow password',
//       html: this.getPasswordResetEmailTemplate(resetUrl, firstName),
//     };
// 
//     await sgMail.send(msg);
//   }
// }