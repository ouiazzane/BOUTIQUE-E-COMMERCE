import { describe, expect, it } from 'vitest';

import { resolveMediaUrl } from './mediaUrl';

describe('media URL resolution', () => {
  it('uses the configured backend origin for MongoDB product images', () => {
    expect(resolveMediaUrl(
      '/api/products/images/507f1f77bcf86cd799439011',
      'https://api.boutique.example/api',
      'https://shop.boutique.example'
    )).toBe('https://api.boutique.example/api/products/images/507f1f77bcf86cd799439011');
  });

  it('rewrites old absolute local-upload URLs to the current backend origin', () => {
    expect(resolveMediaUrl(
      'http://localhost:5000/uploads/product-images/photo.png',
      'https://api.boutique.example/api',
      'https://shop.boutique.example'
    )).toBe('https://api.boutique.example/uploads/product-images/photo.png');
  });

  it('keeps external CDN URLs unchanged', () => {
    const externalUrl = 'https://cdn.example.com/products/photo.png';
    expect(resolveMediaUrl(externalUrl, 'https://api.boutique.example/api')).toBe(externalUrl);
  });
});
