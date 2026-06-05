import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/**
 * Thin SMTP wrapper around nodemailer.
 *
 * If SMTP credentials are not present in the environment the service becomes a
 * no-op (logging instead of sending), so the app keeps working in local/dev
 * setups without email configured. Configure SMTP_HOST / SMTP_PORT / SMTP_USER
 * / SMTP_PASS (and optionally SMTP_FROM) to enable real delivery.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
        secure: process.env.SMTP_PORT === '465',
        auth: { user, pass },
      });
      this.logger.log(`Email transport configured (host: ${host})`);
    } else {
      this.logger.warn('SMTP not configured — email delivery disabled (logging only).');
    }
  }

  get enabled(): boolean {
    return this.transporter !== null;
  }

  async send(to: string, subject: string, text: string, html?: string): Promise<boolean> {
    if (!this.transporter) {
      this.logger.debug(`[email disabled] would send to ${to}: ${subject}`);
      return false;
    }

    try {
      const from = process.env.SMTP_FROM || process.env.SMTP_USER;
      await this.transporter.sendMail({ from, to, subject, text, html: html ?? text });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${(error as Error).message}`);
      return false;
    }
  }
}
