import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend: Resend;
  private from: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY || process.env.SMTP_PASS;
    this.from = process.env.MAIL_FROM || 'Pulse <onboarding@resend.dev>';

    if (apiKey) {
      this.resend = new Resend(apiKey);
      console.log(`[MailService] Resend HTTP API initialized (from: ${this.from})`);
    } else {
      console.log('[MailService] Resend API key not configured. Emails will be logged to console.');
    }
  }

  async sendOtp(email: string, code: string): Promise<void> {
    const subject = 'Your Pulse Login Code';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Pulse Login</h2>
        <p>Your verification code is:</p>
        <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; border-radius: 8px;">
          ${code}
        </div>
        <p>This code expires in <strong>10 minutes</strong>.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">Pulse - Project Management Tool</p>
      </div>
    `;

    await this.sendMail(email, subject, html, `OTP: ${code}`);
  }

  async sendNotification(email: string, message: string): Promise<void> {
    const subject = 'Pulse - Activity Update';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Pulse Update</h2>
        <p>You have a new activity update:</p>
        <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #007bff; margin: 20px 0; border-radius: 4px;">
          ${message}
        </div>
        <p>Visit your dashboard to see the latest changes.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://pulse-front.netlify.app" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Open Dashboard</a>
        </div>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">Pulse - Project Management Tool</p>
      </div>
    `;

    await this.sendMail(email, subject, html, `Notification: ${message}`);
  }

  private async sendMail(to: string, subject: string, html: string, logLabel: string): Promise<void> {
    if (!this.resend) {
      console.log(`[MailService] [STUB] To: ${to} | ${logLabel}`);
      return;
    }

    try {
      const result = await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        html,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      console.log(`[MailService] Email sent successfully to ${to} (${subject})`);
    } catch (error) {
      console.error(`[MailService] Failed to send email to ${to}:`, error);
      console.log(`[MailService] [FALLBACK] To: ${to} | ${logLabel}`);
    }
  }
}