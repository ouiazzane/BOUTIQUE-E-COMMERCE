import nodemailer from 'nodemailer';

import { env } from '../config/env.js';

export type EmailSendResult = {
  ok: boolean;
  skipped: boolean;
  messageId?: string;
  reason?: string;
};

export type TransactionalEmailOptions = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export function createSmtpTransport() {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT || 587,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  });
}

type SmtpTransportFactory = () => ReturnType<typeof createSmtpTransport>;

export async function verifySmtpConnection(factory: SmtpTransportFactory = createSmtpTransport): Promise<{ ok: boolean; reason?: string }> {
  const transport = factory();
  if (!transport) {
    return { ok: false, reason: 'SMTP is not fully configured.' };
  }

  try {
    await transport.verify();
    return { ok: true };
  } catch {
    return { ok: false, reason: 'SMTP connection verification failed. Check the provider settings.' };
  } finally {
    transport.close();
  }
}

export async function sendTransactionalEmail(
  { to, subject, text, html }: TransactionalEmailOptions,
  factory: SmtpTransportFactory = createSmtpTransport
): Promise<EmailSendResult> {
  const transport = factory();

  if (!transport) {
    return {
      ok: false,
      skipped: true,
      reason: 'SMTP is not configured. No transactional email was sent.'
    };
  }

  try {
    const info = await transport.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      text,
      html
    });

    return {
      ok: true,
      skipped: false,
      messageId: info.messageId
    };
  } catch {
    console.error('Transactional email delivery failed; no credentials or message content were logged.');
    return {
      ok: false,
      skipped: false,
      reason: 'Transactional email delivery failed.'
    };
  } finally {
    transport.close();
  }
}

export async function sendSmtpTestEmail(email: string): Promise<EmailSendResult> {
  return sendTransactionalEmail({
    to: email,
    subject: 'BOUTIQUE SMTP test',
    text: 'This is a controlled SMTP test message requested by an administrator.'
  });
}

export async function sendPasswordResetEmail({ email, resetUrl }: { email: string; resetUrl: string }): Promise<EmailSendResult> {
  return sendTransactionalEmail({
    to: email,
    subject: 'Reset your password',
    text: `Use the following link to reset your password: ${resetUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2>Reset your password</h2>
        <p>Use the link below to reset your account password.</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
      </div>
    `
  });
}

export async function sendOrderConfirmationEmail({
  email,
  orderNumber,
  total,
  previewUrl
}: {
  email: string;
  orderNumber: string;
  total: number;
  previewUrl?: string;
}): Promise<EmailSendResult> {
  return sendTransactionalEmail({
    to: email,
    subject: `Order confirmation: ${orderNumber}`,
    text: `Your order ${orderNumber} has been placed successfully. Total: ${total.toFixed(2)} EUR.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2>Order confirmed</h2>
        <p>Thank you for your order.</p>
        <p><strong>Order:</strong> ${orderNumber}</p>
        <p><strong>Total:</strong> ${total.toFixed(2)} EUR</p>
        ${previewUrl ? `<p><a href="${previewUrl}">View order</a></p>` : ''}
      </div>
    `
  });
}

export async function sendPaymentConfirmationEmail({
  email,
  orderNumber,
  total
}: {
  email: string;
  orderNumber: string;
  total: number;
}): Promise<EmailSendResult> {
  return sendTransactionalEmail({
    to: email,
    subject: `Payment confirmed: ${orderNumber}`,
    text: `Payment for order ${orderNumber} has been confirmed. Total charged: ${total.toFixed(2)} EUR.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2>Payment confirmed</h2>
        <p>Your payment has been successfully confirmed for order ${orderNumber}.</p>
        <p><strong>Total charged:</strong> ${total.toFixed(2)} EUR</p>
      </div>
    `
  });
}

export async function sendShipmentNotificationEmail({
  email,
  orderNumber
}: {
  email: string;
  orderNumber: string;
}): Promise<EmailSendResult> {
  return sendTransactionalEmail({
    to: email,
    subject: `Your order has shipped: ${orderNumber}`,
    text: `Your order ${orderNumber} has been marked as shipped. Carrier tracking is not available in this store.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2>Order shipped</h2>
        <p>Your order ${orderNumber} has been shipped and is on its way.</p>
        <p>Carrier tracking is not available in this store.</p>
      </div>
    `
  });
}

export async function sendDeliveryConfirmationEmail({
  email,
  orderNumber
}: {
  email: string;
  orderNumber: string;
}): Promise<EmailSendResult> {
  return sendTransactionalEmail({
    to: email,
    subject: `Order delivered: ${orderNumber}`,
    text: `Your order ${orderNumber} has been delivered.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2>Order delivered</h2>
        <p>Your order ${orderNumber} was delivered successfully.</p>
      </div>
    `
  });
}
