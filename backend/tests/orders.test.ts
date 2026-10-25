import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import app from '../src/app.js';
import Category from '../src/models/Category.js';
import Product from '../src/models/Product.js';
import User from '../src/models/User.js';
import { env } from '../src/config/env.js';
import * as emailService from '../src/services/emailService.js';

describe('order events, shipping state, and payment boundaries', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sends fulfillment notices only after persisted transitions and rejects unverified payment status', async () => {
    const category = await Category.create({ name: 'Order test', slug: 'order-test' });
    const product = await Product.create({
      name: 'Order test product',
      slug: 'order-test-product',
      categoryId: category._id,
      price: 20,
      sku: 'ORDER-TEST-001',
      stock: 5,
      isActive: true
    });
    const customer = await User.create({
      firstName: 'Order',
      lastName: 'Customer',
      email: 'order-customer@example.com',
      passwordHash: 'OrderCustomer123',
      role: 'customer',
      isActive: true
    });
    const admin = await User.create({
      firstName: 'Order',
      lastName: 'Admin',
      email: 'order-admin@example.com',
      passwordHash: 'OrderAdmin123',
      role: 'admin',
      isActive: true
    });
    const customerToken = jwt.sign({ sub: String(customer._id), email: customer.email, role: customer.role }, env.JWT_ACCESS_SECRET);
    const adminToken = jwt.sign({ sub: String(admin._id), email: admin.email, role: admin.role }, env.JWT_ACCESS_SECRET);
    const orderEmail = vi.spyOn(emailService, 'sendOrderConfirmationEmail').mockResolvedValue({ ok: true, skipped: false, messageId: 'order-test' });
    const shipmentEmail = vi.spyOn(emailService, 'sendShipmentNotificationEmail').mockResolvedValue({ ok: true, skipped: false, messageId: 'shipment-test' });
    const deliveredEmail = vi.spyOn(emailService, 'sendDeliveryConfirmationEmail').mockResolvedValue({ ok: true, skipped: false, messageId: 'delivered-test' });
    const paymentEmail = vi.spyOn(emailService, 'sendPaymentConfirmationEmail').mockResolvedValue({ ok: true, skipped: false, messageId: 'payment-test' });

    const payload = {
      items: [{ productId: String(product._id), quantity: 1 }],
      shippingAddress: {
        fullName: 'Order Customer',
        phone: '0123456789',
        address: '1 Example Street',
        city: 'Paris',
        postalCode: '75001',
        country: 'MA'
      },
      paymentMethod: 'cash_on_delivery',
      idempotencyKey: 'order-event-test-key'
    };
    const shippingConfig = await request(app).get('/api/shipping/config');
    expect(shippingConfig.status).toBe(200);
    expect(shippingConfig.body.data.defaultCountry).toBe('MA');
    expect(shippingConfig.body.data.supportedCountries).toEqual(['MA']);

    const shippingQuote = await request(app).post('/api/shipping/quote').send({
      items: payload.items,
      country: 'MA'
    });
    expect(shippingQuote.status).toBe(200);
    expect(shippingQuote.body.data.subtotal).toBe(20);
    expect(shippingQuote.body.data.currency).toBe('EUR');
    expect(shippingQuote.body.data.total).toBe(
      shippingQuote.body.data.subtotal + shippingQuote.body.data.shippingCost
    );
    const unsupportedQuote = await request(app).post('/api/shipping/quote').send({
      items: payload.items,
      country: 'ZZ'
    });
    expect(unsupportedQuote.status).toBe(400);

    const created = await request(app).post('/api/orders').set('Authorization', `Bearer ${customerToken}`).send(payload);
    expect(created.status).toBe(201);
    expect(created.body.data.currency).toBe('EUR');
    expect(created.body.data.shippingCost).toBeGreaterThanOrEqual(0);
    expect(created.body.data.paymentStatus).toBe('pending');
    expect(created.body.data.shippingHistory[0].status).toBe('pending');
    expect(orderEmail).toHaveBeenCalledTimes(1);

    const repeated = await request(app).post('/api/orders').set('Authorization', `Bearer ${customerToken}`).send(payload);
    expect(repeated.status).toBe(200);
    expect(orderEmail).toHaveBeenCalledTimes(1);

    const orderId = created.body.data._id as string;
    const forgedPayment = await request(app)
      .patch(`/api/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'confirmed', paymentStatus: 'paid' });
    expect(forgedPayment.status).toBe(400);
    expect(paymentEmail).not.toHaveBeenCalled();

    const customerPaymentConfirmation = await request(app)
      .patch(`/api/admin/orders/${orderId}/payment/cash-on-delivery`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ confirmed: true, note: 'Cash received by customer' });
    expect(customerPaymentConfirmation.status).toBe(403);

    const prematurePaymentConfirmation = await request(app)
      .patch(`/api/admin/orders/${orderId}/payment/cash-on-delivery`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ confirmed: true, note: 'Cash receipt reference 1234' });
    expect(prematurePaymentConfirmation.status).toBe(409);

    const invalidPaymentNote = await request(app)
      .patch(`/api/admin/orders/${orderId}/payment/cash-on-delivery`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ confirmed: true, note: 'no' });
    expect(invalidPaymentNote.status).toBe(400);
    expect(paymentEmail).not.toHaveBeenCalled();

    for (const status of ['confirmed', 'processing', 'shipped', 'delivered']) {
      const response = await request(app)
        .patch(`/api/admin/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status });
      expect(response.status).toBe(200);
      if (status === 'confirmed') {
        expect(response.body.data.status).toBe('confirmed');
        expect(response.body.data.shippingStatus).toBe('confirmed');
      }
    }

    expect(shipmentEmail).toHaveBeenCalledTimes(1);
    expect(deliveredEmail).toHaveBeenCalledTimes(1);

    const paymentConfirmationPayload = { confirmed: true, note: 'Cash receipt reference 1234' };
    const paymentConfirmations = await Promise.all([
      request(app)
        .patch(`/api/admin/orders/${orderId}/payment/cash-on-delivery`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(paymentConfirmationPayload),
      request(app)
        .patch(`/api/admin/orders/${orderId}/payment/cash-on-delivery`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(paymentConfirmationPayload)
    ]);
    expect(paymentConfirmations.map((response) => response.status).sort()).toEqual([200, 409]);
    const cashPaymentConfirmed = paymentConfirmations.find((response) => response.status === 200);
    expect(cashPaymentConfirmed?.body.data.paymentStatus).toBe('paid');
    expect(cashPaymentConfirmed?.body.data.paymentHistory).toMatchObject([{
      status: 'paid',
      method: 'cash_on_delivery',
      changedBy: String(admin._id),
      note: 'Cash receipt reference 1234'
    }]);
    expect(paymentEmail).toHaveBeenCalledTimes(1);
    expect(paymentConfirmations.filter((response) => response.status === 409)).toHaveLength(1);
    expect(paymentEmail).toHaveBeenCalledTimes(1);

    const customerOrder = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(customerOrder.status).toBe(200);
    expect(customerOrder.body.data.shippingStatus).toBe('delivered');
    expect(customerOrder.body.data.paymentStatus).toBe('paid');
    expect(customerOrder.body.data.deliveredAt).toBeTruthy();
    expect(customerOrder.body.data.shippingHistory.map((event: { status: string }) => event.status))
      .toEqual(['pending', 'confirmed', 'processing', 'shipped', 'delivered']);
  });
});
