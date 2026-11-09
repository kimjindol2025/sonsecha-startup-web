import nodemailer from 'nodemailer';

const requiredSmtpVariables = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_APP_PASSWORD'];
const inquiryRecipient = (process.env.INQUIRY_RECIPIENT || 'bigwash2025@gmail.com').trim();

export class EmailConfigurationError extends Error {
  constructor() {
    super('SMTP_NOT_CONFIGURED');
    this.code = 'SMTP_NOT_CONFIGURED';
  }
}

export class EmailDeliveryError extends Error {
  constructor() {
    super('SMTP_SEND_FAILED');
    this.code = 'SMTP_SEND_FAILED';
  }
}

function smtpConfig() {
  const missing = requiredSmtpVariables.filter((name) => !String(process.env[name] || '').trim());
  if (missing.length) throw new EmailConfigurationError();
  const port = Number.parseInt(process.env.SMTP_PORT, 10);
  const secureValue = String(process.env.SMTP_SECURE).trim().toLowerCase();
  if (!Number.isInteger(port) || port < 1 || port > 65535 || !['true', 'false'].includes(secureValue)) {
    throw new EmailConfigurationError();
  }
  return {
    host: process.env.SMTP_HOST.trim(),
    port,
    secure: secureValue === 'true',
    user: process.env.SMTP_USER.trim(),
    password: process.env.SMTP_APP_PASSWORD,
  };
}

function safeSubject(value) {
  return String(value || '손세차장 고객 문의').replace(/[\r\n]+/g, ' ').slice(0, 180);
}

export async function sendCustomerEmail({ subject, text, replyTo = '' }) {
  const config = smtpConfig();
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.password },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  });
  try {
    await transporter.sendMail({
      from: config.user,
      to: inquiryRecipient,
      replyTo: replyTo || undefined,
      subject: safeSubject(subject),
      text: String(text || ''),
    });
  } catch (error) {
    // Never print SMTP credentials or the full provider response.
    console.error('[email] SMTP delivery failed', { code: error?.code || 'UNKNOWN', responseCode: error?.responseCode || '' });
    throw new EmailDeliveryError();
  } finally {
    transporter.close();
  }
}
