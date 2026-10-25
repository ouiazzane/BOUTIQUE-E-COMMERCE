import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../src/app.js';

describe('auth endpoints', () => {
  it('registers a valid customer', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Ana',
        lastName: 'Martin',
        email: 'ana@example.com',
        password: 'SuperSecret123',
        confirmPassword: 'SuperSecret123'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('ana@example.com');
  });

  it('rejects duplicate email registration', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Ana',
        lastName: 'Martin',
        email: 'ana@example.com',
        password: 'SuperSecret123',
        confirmPassword: 'SuperSecret123'
      });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });
});
