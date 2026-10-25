import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

import Category from '../src/models/Category.js';
import Order from '../src/models/Order.js';
import Product from '../src/models/Product.js';
import ProductImageAsset from '../src/models/ProductImageAsset.js';
import User from '../src/models/User.js';
import app from '../src/app.js';
import { env } from '../src/config/env.js';

beforeAll(async () => {
  await Category.deleteMany({});
  await Product.deleteMany({});

  const category = await Category.create({
    name: 'Électronique',
    slug: 'electronique',
    description: 'test category',
    image: 'https://example.com/cat.jpg'
  });

  await Product.create({
    name: 'Produit test',
    slug: 'produit-test',
    shortDescription: 'Très bon produit',
    description: 'Description longue du produit',
    categoryId: category._id,
    price: 99,
    sku: 'TEST-001',
    stock: 10,
    images: [{ url: 'https://example.com/image.jpg', alt: 'Produit test', isPrimary: true }],
    isActive: true,
    isFeatured: true
  });
});

describe('products endpoints', () => {
  it('stores uploaded images in MongoDB and serves the same image after product reactivation', async () => {
    const category = await Category.findOne({ slug: 'electronique' });
    if (!category) throw new Error('Product test category was not initialized.');
    const admin = await User.create({
      firstName: 'Image',
      lastName: 'Admin',
      email: 'product-image-admin@example.com',
      passwordHash: 'ImageAdmin123',
      role: 'admin',
      isActive: true
    });
    const token = jwt.sign({ sub: String(admin._id), email: admin.email, role: admin.role }, env.JWT_ACCESS_SECRET);
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const upload = await request(app)
      .post('/api/products/images')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', png, { filename: 'photo.png', contentType: 'image/png' });

    expect(upload.status).toBe(201);
    const imageUrl = upload.body.data.url as string;
    expect(imageUrl).toMatch(/^\/api\/products\/images\/[a-f\d]{24}$/i);
    const imageId = imageUrl.split('/').at(-1);
    const storedAsset = await ProductImageAsset.findById(imageId);
    expect(storedAsset?.contentType).toBe('image/png');
    expect(storedAsset?.data.toString('base64')).toBe(png.toString('base64'));

    const createProduct = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Uploaded image lifecycle test',
        slug: 'uploaded-image-lifecycle-test',
        shortDescription: 'Image lifecycle test',
        description: 'Image lifecycle test product.',
        categoryId: String(category._id),
        price: 20,
        sku: 'IMAGE-LIFECYCLE-TEST-001',
        stock: 2,
        images: [{ url: imageUrl, isPrimary: true }],
        isActive: true
      });
    expect(createProduct.status).toBe(201);
    const productId = createProduct.body.data._id as string;

    const deactivated = await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deactivated.status).toBe(200);
    const reactivated = await request(app)
      .patch(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isActive: true });
    expect(reactivated.status).toBe(200);
    const persistedProduct = await Product.findById(productId);
    expect(persistedProduct?.images[0]?.url).toBe(imageUrl);

    const servedImage = await request(app).get(imageUrl);
    expect(servedImage.status).toBe(200);
    expect(servedImage.headers['content-type']).toContain('image/png');
    expect(Buffer.from(servedImage.body).equals(png)).toBe(true);

    const imageCategory = await Category.create({
      name: 'Uploaded image category test',
      slug: 'uploaded-image-category-test',
      description: 'Category image lifecycle test.'
    });
    const setCategoryImage = await request(app)
      .patch(`/api/categories/${imageCategory._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ image: imageUrl });
    expect(setCategoryImage.status).toBe(200);
    const updateCategoryDescription = await request(app)
      .patch(`/api/categories/${imageCategory._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Updated category description.' });
    expect(updateCategoryDescription.status).toBe(200);
    expect((await Category.findById(imageCategory._id))?.image).toBe(imageUrl);

    await Product.deleteOne({ _id: productId });
    await Category.deleteOne({ _id: imageCategory._id });
    await ProductImageAsset.deleteOne({ _id: imageId });
  });

  it('does not expose a product image when the image id is invalid or missing', async () => {
    const invalidId = await request(app).get('/api/products/images/not-an-id');
    const missingImage = await request(app).get('/api/products/images/507f1f77bcf86cd799439011');

    expect(invalidId.status).toBe(404);
    expect(missingImage.status).toBe(404);
  });

  it('lists active products', async () => {
    const response = await request(app).get('/api/products');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data.products)).toBe(true);
  });

  it('filters products by the category slug used by the storefront', async () => {
    const response = await request(app).get('/api/products?category=electronique');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.products).toHaveLength(1);
    expect(response.body.data.products[0].sku).toBe('TEST-001');
  });

  it('returns an empty list for an unknown category slug instead of a server error', async () => {
    const response = await request(app).get('/api/products?category=unknown-category');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.products).toHaveLength(0);
    expect(response.body.data.pagination.totalItems).toBe(0);
  });

  it('allows admins to deactivate and reactivate products, and permanently deletes only products without order history', async () => {
    const category = await Category.findOne({ slug: 'electronique' });
    if (!category) throw new Error('Product test category was not initialized.');
    const admin = await User.create({
      firstName: 'Catalog',
      lastName: 'Admin',
      email: 'catalog-admin@example.com',
      passwordHash: 'CatalogAdmin123',
      role: 'admin',
      isActive: true
    });
    const token = jwt.sign({ sub: String(admin._id), email: admin.email, role: admin.role }, env.JWT_ACCESS_SECRET);
    const product = await Product.create({
      name: 'Lifecycle test product',
      slug: 'lifecycle-test-product',
      shortDescription: 'A product lifecycle test',
      description: 'A detailed product lifecycle test.',
      categoryId: category._id,
      price: 10,
      sku: 'LIFECYCLE-TEST-001',
      stock: 5,
      isActive: true
    });

    const deactivated = await request(app)
      .delete(`/api/products/${product._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deactivated.status).toBe(200);
    expect(await Product.findById(product._id).then((result) => result?.isActive)).toBe(false);
    expect((await request(app).get(`/api/products/${product.slug}`)).status).toBe(404);

    const adminCatalog = await request(app)
      .get('/api/admin/products')
      .set('Authorization', `Bearer ${token}`);
    expect(adminCatalog.body.data.products.some((entry: { _id: string }) => entry._id === String(product._id))).toBe(true);

    const reactivated = await request(app)
      .patch(`/api/products/${product._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isActive: true });
    expect(reactivated.status).toBe(200);
    expect(reactivated.body.data.isActive).toBe(true);
    expect((await request(app).get(`/api/products/${product.slug}`)).status).toBe(200);

    const permanentlyDeleted = await request(app)
      .delete(`/api/products/${product._id}/permanent`)
      .set('Authorization', `Bearer ${token}`);
    expect(permanentlyDeleted.status).toBe(200);
    expect(await Product.findById(product._id)).toBeNull();

    const orderedProduct = await Product.create({
      name: 'Historical product',
      slug: 'historical-product',
      shortDescription: 'A product with order history',
      description: 'A product with a historical order reference.',
      categoryId: category._id,
      price: 12,
      sku: 'HISTORICAL-TEST-001',
      stock: 0,
      isActive: true
    });
    await Order.create({
      orderNumber: 'TEST-HISTORICAL-ORDER-001',
      userId: admin._id,
      items: [{
        productId: orderedProduct._id,
        name: orderedProduct.name,
        sku: orderedProduct.sku,
        unitPrice: orderedProduct.price,
        quantity: 1,
        lineTotal: orderedProduct.price
      }],
      shippingAddress: {
        fullName: 'Catalog Admin',
        phone: '0123456789',
        address: '1 Test Street',
        city: 'Paris',
        postalCode: '75001',
        country: 'MA'
      },
      subtotal: 12,
      shippingCost: 0,
      total: 12,
      currency: 'EUR'
    });

    const rejectedDelete = await request(app)
      .delete(`/api/products/${orderedProduct._id}/permanent`)
      .set('Authorization', `Bearer ${token}`);
    expect(rejectedDelete.status).toBe(409);
    expect(await Product.findById(orderedProduct._id).then((result) => result?.isActive)).toBe(false);
  });
});
