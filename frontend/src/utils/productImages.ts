import type { Category, ProductImage as ProductImageData } from '../types';

export type ProductImageInput = {
  sku?: string;
  categoryId?: Category | string;
  images?: ProductImageData[];
};

const fallbackByCategory: Record<string, string> = {
  electronique: '/images/fallback/electronics.svg',
  mode: '/images/fallback/fashion.svg',
  maison: '/images/fallback/home.svg',
  accessoires: '/images/fallback/accessories.svg',
  electronics: '/images/fallback/electronics.svg',
  fashion: '/images/fallback/fashion.svg',
  home: '/images/fallback/home.svg',
  accessories: '/images/fallback/accessories.svg'
};

// These seed mappings are demonstrably unrelated to the listed products.
// Keep them on a category-safe fallback until a real product photo is curated.
const knownMismatchedSeedImages: Record<string, string[]> = {
  'MOD-001': ['photo-1542291026-7eec264c27ff'],
  'MOD-002': ['photo-1483985988355-763728e1935b'],
  'MOD-003': ['photo-1543163521-1bf539c55dd2'],
  'ELE-003': ['photo-1585386959984-a4155224a1ad'],
  'ELE-004': ['photo-1583394838336-acd977736f90'],
  'MAI-004': ['photo-1586201375761-83865001e31d'],
  'ACC-001': ['photo-1521572267360-ee0c2909d518'],
  'ACC-003': ['photo-1617038220319-276d3cfab638'],
  'ACC-004': ['photo-1522335789203-aabd1fc54bc9'],
  'ELE-006': ['photo-1516321318423-f06f85e504b3'],
  'ACC-005': ['photo-1556656793-08538906a9f8'],
  'MAI-001': ['photo-1505693416388-ac5ce068fe85'],
  'MAI-002': ['photo-1505693416388-ac5ce068fe85'],
  'MAI-005': ['photo-1505693416388-ac5ce068fe85'],
  'MAI-006': ['photo-1505693416388-ac5ce068fe85']
};

export function getCategoryFallback(product: ProductImageInput): string {
  const category = typeof product.categoryId === 'object' && product.categoryId !== null
    ? product.categoryId.slug
    : product.categoryId;
  const normalized = (category ?? '').toLowerCase();
  if (fallbackByCategory[normalized]) return fallbackByCategory[normalized];

  const prefix = product.sku?.slice(0, 3).toUpperCase();
  if (prefix === 'ELE') return fallbackByCategory.electronique;
  if (prefix === 'MOD') return fallbackByCategory.mode;
  if (prefix === 'MAI') return fallbackByCategory.maison;
  if (prefix === 'ACC') return fallbackByCategory.accessoires;
  return fallbackByCategory.maison;
}

export function isUsableImageUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim() === '') return false;
  if (value.startsWith('/')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isKnownMismatchedProductImage(product: ProductImageInput, url: string): boolean {
  const blockedAssetIds = knownMismatchedSeedImages[product.sku ?? ''] ?? [];
  return blockedAssetIds.some((assetId) => url.includes(assetId));
}

export function getUsableProductImages(product: ProductImageInput): ProductImageData[] {
  return (product.images ?? []).filter((image) =>
    isUsableImageUrl(image.url) && !isKnownMismatchedProductImage(product, image.url)
  );
}

export function selectProductImage(product: ProductImageInput): { src: string; isFallback: boolean } {
  const fallback = getCategoryFallback(product);
  const images = getUsableProductImages(product);
  const preferred = images.find((image) => image.isPrimary) ?? images[0];

  if (!preferred) return { src: fallback, isFallback: true };

  return { src: preferred.url, isFallback: false };
}
