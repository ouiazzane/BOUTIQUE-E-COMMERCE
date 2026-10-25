import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../src/app.js';
import User from '../src/models/User.js';

describe('admin authorization', () => {
  it('allows the storefront origin to display uploaded product images', async () => {
    const response = await request(app).get('/uploads/product-images/not-present.png');

    expect(response.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });

  it('requires authentication for admin reads', async () => {
    for (const path of ['/api/admin/stats', '/api/admin/products', '/api/admin/categories', '/api/admin/orders', '/api/admin/users', '/api/admin/email/smtp-check']) {
      const response = await request(app).get(path);
      expect(response.status, path).toBe(401);
    }

    const smtpTest = await request(app).post('/api/admin/email/test');
    expect(smtpTest.status).toBe(401);
  });

  it('requires authentication for product and category writes', async () => {
    const productResponse = await request(app).post('/api/products').send({});
    const categoryResponse = await request(app).post('/api/categories').send({});
    const imageResponse = await request(app).post('/api/products/images');
    const orderResponse = await request(app).patch('/api/admin/orders/507f1f77bcf86cd799439011/status').send({ status: 'confirmed' });
    const productDeleteResponse = await request(app).delete('/api/products/507f1f77bcf86cd799439011/permanent');

    expect(productResponse.status).toBe(401);
    expect(categoryResponse.status).toBe(401);
    expect(imageResponse.status).toBe(401);
    expect(orderResponse.status).toBe(401);
    expect(productDeleteResponse.status).toBe(401);
  });

  it('denies admin access to an authenticated customer', async () => {
    const registration = await request(app).post('/api/auth/register').send({
      firstName: 'Test',
      lastName: 'Client',
      email: 'admin-boundary@example.com',
      password: 'CustomerTest123',
      confirmPassword: 'CustomerTest123',
      role: 'admin'
    });

    expect(registration.status).toBe(201);
    expect(registration.body.data.user.role).toBe('customer');
    const token = registration.body.data.token as string;
    const response = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(403);

    const productWrite = await request(app).post('/api/products').set('Authorization', `Bearer ${token}`).send({});
    const categoryWrite = await request(app).post('/api/categories').set('Authorization', `Bearer ${token}`).send({});
    const orderWrite = await request(app).patch('/api/admin/orders/507f1f77bcf86cd799439011/status').set('Authorization', `Bearer ${token}`).send({ status: 'confirmed' });

    expect(productWrite.status).toBe(403);
    expect(categoryWrite.status).toBe(403);
    expect(orderWrite.status).toBe(403);
    const productDelete = await request(app).delete('/api/products/507f1f77bcf86cd799439011/permanent').set('Authorization', `Bearer ${token}`);
    expect(productDelete.status).toBe(403);
  });

  it('denies product image uploads to an authenticated customer', async () => {
    const registration = await request(app).post('/api/auth/register').send({
      firstName: 'Upload',
      lastName: 'Client',
      email: 'image-upload-boundary@example.com',
      password: 'CustomerUpload123',
      confirmPassword: 'CustomerUpload123'
    });

    expect(registration.status).toBe(201);
    const token = registration.body.data.token as string;
    const response = await request(app)
      .post('/api/products/images')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', Buffer.from('not-an-image'), { filename: 'photo.png', contentType: 'image/png' });

    expect(response.status).toBe(403);
  });

  it('authenticates an existing admin and grants admin API access', async () => {
    await User.create({
      firstName: 'Test',
      lastName: 'Admin',
      email: 'admin-login-test@example.com',
      passwordHash: 'AdminLoginTest123',
      role: 'admin',
      isActive: true
    });

    const login = await request(app).post('/api/auth/login').send({
      email: 'ADMIN-LOGIN-TEST@example.com',
      password: 'AdminLoginTest123'
    });

    expect(login.status).toBe(200);
    expect(login.body.data.user.role).toBe('admin');
    const token = login.body.data.token as string;
    const dashboard = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${token}`);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.success).toBe(true);
  });
});
