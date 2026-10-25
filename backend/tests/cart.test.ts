import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../src/app.js';
import Category from '../src/models/Category.js';
import Product from '../src/models/Product.js';

describe('persistent user carts', () => {
  it('persists CRUD changes, merges guest quantities once, validates stock, and isolates users', async () => {
    const category = await Category.create({ name: 'Cart test', slug: 'cart-test' });
    const product = await Product.create({
      name: 'Cart test product',
      slug: 'cart-test-product',
      categoryId: category._id,
      price: 23.45,
      sku: 'CART-TEST-001',
      stock: 8,
      isActive: true
    });

    const firstRegistration = await request(app).post('/api/auth/register').send({
      firstName: 'Cart',
      lastName: 'Owner',
      email: 'cart-owner@example.com',
      password: 'CartOwner123',
      confirmPassword: 'CartOwner123'
    });
    const ownerToken = firstRegistration.body.data.token as string;

    const secondRegistration = await request(app).post('/api/auth/register').send({
      firstName: 'Other',
      lastName: 'Customer',
      email: 'cart-other@example.com',
      password: 'CartOther123',
      confirmPassword: 'CartOther123'
    });
    const otherToken = secondRegistration.body.data.token as string;

    expect((await request(app).get('/api/cart')).status).toBe(401);

    const firstAdd = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ productId: String(product._id), quantity: 2 });
    expect(firstAdd.status).toBe(200);

    const duplicateAdd = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ productId: String(product._id), quantity: 1 });
    expect(duplicateAdd.body.data.items).toHaveLength(1);
    expect(duplicateAdd.body.data.items[0].quantity).toBe(3);
    expect(duplicateAdd.body.data.items[0].product.price).toBe(23.45);

    const mergePayload = {
      mergeId: '11111111-1111-4111-8111-111111111111',
      items: [{ productId: String(product._id), quantity: 3 }]
    };
    const [merge, repeatedMerge] = await Promise.all([
      request(app)
        .post('/api/cart/merge')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(mergePayload),
      request(app)
        .post('/api/cart/merge')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(mergePayload)
    ]);
    expect(merge.status).toBe(200);
    expect(merge.body.data.items).toHaveLength(1);
    expect(merge.body.data.items[0].quantity).toBe(6);
    expect(repeatedMerge.status).toBe(200);
    expect(repeatedMerge.body.data.items[0].quantity).toBe(6);

    const mergeWithoutId = await request(app)
      .post('/api/cart/merge')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ items: [{ productId: String(product._id), quantity: 1 }] });
    expect(mergeWithoutId.status).toBe(400);

    const persisted = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(persisted.body.data.items).toHaveLength(1);
    expect(persisted.body.data.items[0].quantity).toBe(6);

    const invalidQuantity = await request(app)
      .patch(`/api/cart/items/${product._id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ quantity: 0 });
    expect(invalidQuantity.status).toBe(400);

    const excessiveQuantity = await request(app)
      .patch(`/api/cart/items/${product._id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ quantity: 9 });
    expect(excessiveQuantity.status).toBe(409);

    const otherCart = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${otherToken}`);
    expect(otherCart.status).toBe(200);
    expect(otherCart.body.data.items).toHaveLength(0);

    const remove = await request(app)
      .delete(`/api/cart/items/${product._id}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(remove.status).toBe(200);
    expect(remove.body.data.items).toHaveLength(0);

    const replaced = await request(app)
      .put('/api/cart')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ items: [{ productId: String(product._id), quantity: 2 }] });
    expect(replaced.status).toBe(200);
    expect(replaced.body.data.items[0].quantity).toBe(2);

    const cleared = await request(app)
      .delete('/api/cart')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(cleared.status).toBe(200);
    expect(cleared.body.data.items).toHaveLength(0);
  });
});
