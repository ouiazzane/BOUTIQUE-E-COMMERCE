import { describe, expect, it } from 'vitest';

import { getCategoryFallback, selectProductImage } from './productImages';

describe('product image selection', () => {
  it('uses the home-category fallback instead of the known bed photo for a bathroom mirror', () => {
    const selected = selectProductImage({
      sku: 'MAI-006',
      categoryId: { _id: 'home-id', name: 'Maison', slug: 'maison' },
      images: [{ url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format', alt: 'Miroir de salle de bain', isPrimary: true }]
    });

    expect(selected).toEqual({ src: '/images/fallback/home.svg', isFallback: true });
  });

  it('uses the home fallback instead of a bedroom scene for a lamp, rug, or cushions', () => {
    for (const sku of ['MAI-001', 'MAI-002', 'MAI-005']) {
      expect(selectProductImage({
        sku,
        categoryId: 'maison',
        images: [{ url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85', isPrimary: true }]
      })).toEqual({ src: '/images/fallback/home.svg', isFallback: true });
    }
  });

  it('uses the category-appropriate illustration if a product has no image', () => {
    expect(selectProductImage({ sku: 'ELE-001', categoryId: 'electronique', images: [] })).toEqual({
      src: '/images/fallback/electronics.svg',
      isFallback: true
    });
  });

  it('rejects all visually audited unrelated demo assets by SKU', () => {
    const mismatches = [
      ['MOD-001', 'photo-1542291026-7eec264c27ff', '/images/fallback/fashion.svg'],
      ['MOD-002', 'photo-1483985988355-763728e1935b', '/images/fallback/fashion.svg'],
      ['MOD-003', 'photo-1543163521-1bf539c55dd2', '/images/fallback/fashion.svg'],
      ['ELE-003', 'photo-1585386959984-a4155224a1ad', '/images/fallback/electronics.svg'],
      ['ELE-004', 'photo-1583394838336-acd977736f90', '/images/fallback/electronics.svg'],
      ['MAI-004', 'photo-1586201375761-83865001e31d', '/images/fallback/home.svg'],
      ['ACC-003', 'photo-1617038220319-276d3cfab638', '/images/fallback/accessories.svg'],
      ['ACC-004', 'photo-1522335789203-aabd1fc54bc9', '/images/fallback/accessories.svg'],
      ['ELE-006', 'photo-1516321318423-f06f85e504b3', '/images/fallback/electronics.svg'],
      ['ACC-005', 'photo-1556656793-08538906a9f8', '/images/fallback/accessories.svg']
    ] as const;

    for (const [sku, assetId, fallback] of mismatches) {
      expect(selectProductImage({ sku, images: [{ url: `https://images.unsplash.com/${assetId}` }] })).toEqual({
        src: fallback,
        isFallback: true
      });
    }
  });

  it('uses a category fallback for malformed or unsupported image URLs', () => {
    expect(selectProductImage({ sku: 'MOD-001', images: [{ url: 'javascript:alert(1)' }] })).toEqual({
      src: '/images/fallback/fashion.svg',
      isFallback: true
    });
  });

  it('retains an available product image when its product mapping is not flagged', () => {
    const imageUrl = 'https://cdn.example.com/products/verified-headphones.webp';
    expect(selectProductImage({ sku: 'ELE-001', images: [{ url: imageUrl, isPrimary: true }] })).toEqual({
      src: imageUrl,
      isFallback: false
    });
  });

  it('keeps a newly uploaded MongoDB image for the tote product instead of selecting the fallback', () => {
    const imageUrl = '/api/products/images/507f1f77bcf86cd799439011';
    expect(selectProductImage({
      sku: 'ACC-001',
      categoryId: 'accessoires',
      images: [{ url: imageUrl, isPrimary: true }]
    })).toEqual({ src: imageUrl, isFallback: false });
  });

  it('selects the same image deterministically after a page/cart reload', () => {
    const persistedCartProduct = {
      sku: 'MAI-006',
      categoryId: 'maison',
      images: [{ url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85', isPrimary: true }]
    };
    expect(selectProductImage(persistedCartProduct)).toEqual(selectProductImage(structuredClone(persistedCartProduct)));
  });

  it('selects the fallback by product category or SKU prefix', () => {
    expect(getCategoryFallback({ categoryId: 'maison' })).toBe('/images/fallback/home.svg');
    expect(getCategoryFallback({ sku: 'ACC-004' })).toBe('/images/fallback/accessories.svg');
  });
});
