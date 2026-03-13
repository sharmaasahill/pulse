import { Injectable } from '@nestjs/common';
import * as https from 'https';

@Injectable()
export class MailService {
  private apiKey: string;
  private from: string;

  constructor() {
    this.apiKey = process.env.BREVO_API_KEY || '';
    this.from = process.env.MAIL_FROM || 'i.sahilkrsharma@gmail.com';

    if (this.apiKey) {
      console.log(`[MailService] Brevo API initialized (from: ${this.from})`);
    } else {
      console.log('[MailService] Brevo API key not configured. Emails will be logged to console.');
    }
  }

  async sendOtp(email: string, code: string): Promise<void> {
    const subject = 'Your Pulse Login Code';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #fff; border-radius: 12px; padding: 40px;">
        <h2 style="color: #fff; font-size: 24px; margin-bottom: 8px;">⚡ Pulse</h2>
        <p style="color: #aaa; margin-bottom: 32px;">Your verification code</p>
        <div style="background: #1a1a1a; padding: 24px; text-align: center; font-size: 36px; font-weight: bold; letter-spacing: 12px; border-radius: 8px; border: 1px solid #333; margin-bottom: 24px;">
          ${code}
        </div>
        <p style="color: #aaa;">This code expires in <strong style="color:#fff;">10 minutes</strong>.</p>
        <p style="color: #555; font-size: 13px; margin-top: 32px; border-top: 1px solid #222; padding-top: 24px;">If you didn't request this, ignore this email.</p>
      </div>
    `;
    await this.sendMail(email, subject, html, `OTP: ${code}`);
  }

  async sendNotification(email: string, message: string): Promise<void> {
    const subject = 'Pulse - Activity Update';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Pulse Update</h2>
        <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #007bff; margin: 20px 0; border-radius: 4px;">
          ${message}
        </div>
        <a href="https://pulse-front.netlify.app" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Open Dashboard</a>
      </div>
    `;
    await this.sendMail(email, subject, html, `Notification: ${message}`);
  }

  private async sendMail(to: string, subject: string, html: string, logLabel: string): Promise<void> {
    if (!this.apiKey) {
      console.log(`[MailService] [STUB] To: ${to} | ${logLabel}`);
      return;
    }

    const payload = JSON.stringify({
      sender: { name: 'Pulse', email: this.from },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    });

    return new Promise((resolve) => {
      const options = {
        hostname: 'api.brevo.com',
        path: '/v3/smtp/email',
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'content-type': 'application/json',
          'accept': 'application/json',
          'content-length': Buffer.byteLength(payload),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`[MailService] Email sent successfully to ${to} (${subject})`);
          } else {
            console.error(`[MailService] Failed to send email to ${to}: ${res.statusCode} - ${data}`);
            console.log(`[MailService] [FALLBACK] To: ${to} | ${logLabel}`);
          }
          resolve();
        });
      });

      req.on('error', (err) => {
        console.error(`[MailService] Request error for ${to}:`, err.message);
        console.log(`[MailService] [FALLBACK] To: ${to} | ${logLabel}`);
        resolve();
      });

      req.write(payload);
      req.end();
    });
  }
}