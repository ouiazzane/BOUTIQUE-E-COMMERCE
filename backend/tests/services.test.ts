import { describe, expect, it } from 'vitest';

import { sendTransactionalEmail, verifySmtpConnection } from '../src/services/emailService.js';
import { DEFAULT_CURRENCY, formatMoney, normalizeCurrency, roundMoney } from '../src/services/currencyService.js';
import { calculateShippingCost } from '../src/services/shippingService.js';

describe('commerce services', () => {
  it('applies free shipping for supported destinations above the threshold', () => {
    const result = calculateShippingCost({ subtotal: 250, country: 'MA', freeShippingThreshold: 200, defaultShippingCost: 15 });

    expect(result.supported).toBe(true);
    expect(result.amount).toBe(0);
    expect(result.message).toBe('Free shipping applied.');
  });

  it('charges the configured rate below the threshold and rounds currency to cents', () => {
    const result = calculateShippingCost({ subtotal: 199.99, country: 'MA', freeShippingThreshold: 200, defaultShippingCost: 12.345 });

    expect(result.amount).toBe(12.35);
    expect(roundMoney(1.005)).toBe(1.01);
  });

  it('rejects unsupported shipping destinations', () => {
    const result = calculateShippingCost({ subtotal: 80, country: 'FR' });

    expect(result.supported).toBe(false);
    expect(result.message).toBe('Shipping is not available for this destination.');
  });

  it('normalizes Morocco names to the supported MA destination', () => {
    expect(calculateShippingCost({ subtotal: 80, country: 'Maroc' }).supported).toBe(true);
    expect(calculateShippingCost({ subtotal: 80, country: 'Morocco' }).country).toBe('MA');
  });

  it('uses EUR as the only billing and display currency', () => {
    expect(formatMoney(25, 'EUR')).toContain('€');
    expect(DEFAULT_CURRENCY).toBe('EUR');
    expect(normalizeCurrency('EUR')).toBe('EUR');
    expect(() => normalizeCurrency('USD')).toThrow('Unsupported billing currency');
  });

  it('skips SMTP delivery when no credentials are configured', async () => {
    const result = await sendTransactionalEmail({
      to: 'customer@example.com',
      subject: 'Test email',
      text: 'This should not be sent without SMTP'
    }, () => null);

    expect(result.skipped).toBe(true);
  });

  it('verifies a configured SMTP transport without revealing provider errors', async () => {
    let verified = false;
    let closed = false;
    const fakeTransport = {
      verify: async () => { verified = true; },
      close: () => { closed = true; },
      sendMail: async () => ({ messageId: 'test-id' })
    };

    const result = await verifySmtpConnection(() => fakeTransport as never);

    expect(result).toEqual({ ok: true });
    expect(verified).toBe(true);
    expect(closed).toBe(true);
  });

  it('builds and sends the requested message through the injected SMTP transport', async () => {
    let sentMessage: Record<string, unknown> | undefined;
    const fakeTransport = {
      verify: async () => undefined,
      close: () => undefined,
      sendMail: async (message: Record<string, unknown>) => {
        sentMessage = message;
        return { messageId: 'controlled-test-message' };
      }
    };

    const result = await sendTransactionalEmail({
      to: 'admin@example.com',
      subject: 'BOUTIQUE SMTP test',
      text: 'Controlled test message'
    }, () => fakeTransport as never);

    expect(result).toEqual({ ok: true, skipped: false, messageId: 'controlled-test-message' });
    expect(sentMessage).toMatchObject({
      to: 'admin@example.com',
      subject: 'BOUTIQUE SMTP test',
      text: 'Controlled test message'
    });
  });

  it('returns a truthful failure and closes transport when SMTP send fails', async () => {
    let closed = false;
    const fakeTransport = {
      verify: async () => undefined,
      close: () => { closed = true; },
      sendMail: async () => { throw new Error('credential details must never escape'); }
    };

    const result = await sendTransactionalEmail({
      to: 'admin@example.com',
      subject: 'Controlled SMTP test',
      text: 'Test'
    }, () => fakeTransport as never);

    expect(result).toEqual({
      ok: false,
      skipped: false,
      reason: 'Transactional email delivery failed.'
    });
    expect(closed).toBe(true);
  });
});
