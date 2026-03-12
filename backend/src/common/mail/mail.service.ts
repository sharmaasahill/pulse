import { Injectable, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private transporter: nodemailer.Transporter;

  onModuleInit() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for 465, false for other ports
        auth: {
          user,
          pass,
        },
      });
      console.log(`[MailService] SMTP Transporter initialized (${host}:${port})`);
    } else {
      console.log('[MailService] SMTP not fully configured. Emails will be logged to console.');
    }
  }

  async sendOtp(email: string, code: string): Promise<void> {
    const subject = 'Your Pulse Login Code';
    const text = `Your verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Pulse Login</h2>
        <p>Your verification code is:</p>
        <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; margin: 20px 0; border-radius: 8px;">
          ${code}
        </div>
        <p>This code expires in 10 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">Pulse - Project Management Tool</p>
      </div>
    `;

    await this.sendMail(email, subject, text, html, `OTP: ${code}`);
  }

  async sendNotification(email: string, message: string): Promise<void> {
    const subject = 'Pulse - Activity Update';
    const text = `You have a new activity update:\n\n${message}\n\nVisit your dashboard to see the latest changes.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Pulse Update</h2>
        <p>You have a new activity update:</p>
        <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #007bff; margin: 20px 0; border-radius: 4px;">
          ${message}
        </div>
        <p>Visit your dashboard to see the latest changes and stay updated with your team.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://pulse-frontend.netlify.app" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Open Dashboard</a>
        </div>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">Pulse - Project Management Tool</p>
      </div>
    `;

    await this.sendMail(email, subject, text, html, `Notification: ${message}`);
  }

  private async sendMail(to: string, subject: string, text: string, html: string, logLabel: string): Promise<void> {
    const from = process.env.MAIL_FROM || 'no-reply@pulse.app';

    if (!this.transporter) {
      console.log(`[MailService] [STUB] To: ${to} | ${logLabel}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
      });
      console.log(`[MailService] Email sent successfully to ${to} (${subject})`);
    } catch (error) {
      console.error(`[MailService] Failed to send email to ${to}:`, error);
      // Fallback log
      console.log(`[MailService] [FALLBACK] To: ${to} | ${logLabel}`);
    }
  }
}