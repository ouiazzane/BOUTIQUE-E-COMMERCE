import type { Category } from '../types';

type ProductCopy = { name: string; shortDescription: string; description: string };

const categoryCopy: Record<string, { name: string; description: string }> = {
  electronique: { name: 'Electronics', description: 'Technology for work, home, and everyday life.' },
  mode: { name: 'Fashion', description: 'Everyday essentials with a considered style.' },
  maison: { name: 'Home', description: 'Thoughtful pieces for a more comfortable home.' },
  accessoires: { name: 'Accessories', description: 'Useful finishing touches for everyday life.' }
};

const productCopy: Record<string, ProductCopy> = {
  'ELE-001': { name: 'Premium Audio Headphones', shortDescription: 'Immersive sound and lasting comfort', description: 'Wireless noise-cancelling headphones with up to 30 hours of battery life.' },
  'ELE-002': { name: 'Pro Smartwatch', shortDescription: 'Fitness tracking and smart notifications', description: 'An AMOLED smartwatch with sleep tracking and built-in GPS.' },
  'MOD-001': { name: 'Urban Backpack', shortDescription: 'Minimalist, functional design', description: 'A lightweight backpack with multiple compartments for everyday use.' },
  'MOD-002': { name: 'Elegant Shirt', shortDescription: 'A classic fit for every occasion', description: 'A premium cotton shirt designed for a polished, professional look.' },
  'MAI-001': { name: 'Designer Table Lamp', shortDescription: 'Soft, modern lighting', description: 'A minimalist lamp for the living room or bedroom with a warm glow.' },
  'MAI-002': { name: 'Soft Area Rug', shortDescription: 'Comfort for your living room', description: 'A plush rug made with soft fibers for a cozy interior.' },
  'ELE-003': { name: 'Wireless Earbuds', shortDescription: 'Compact and high-performing', description: 'Compact earbuds with noise cancellation, made for listening on the go.' },
  'ELE-004': { name: 'USB-C Fast Charger', shortDescription: 'Fast, reliable charging', description: 'A fast charger for phones, tablets, and USB-C accessories.' },
  'MAI-003': { name: 'Ceramic Mug', shortDescription: 'Elegant, durable ceramic', description: 'A premium mug for coffee or tea with an elegant finish.' },
  'ACC-001': { name: 'Shopping Tote', shortDescription: 'Versatile and durable', description: 'A practical shopping tote with an outer pocket and secure closure.' },
  'ACC-002': { name: 'Portable Solar Charger', shortDescription: 'Power on the go', description: 'A compact solar panel for outdoor use and emergency power.' },
  'MOD-003': { name: 'Elegant Ankle Boots', shortDescription: 'Comfort meets style', description: 'Soft leather ankle boots with a lightweight, durable sole.' },
  'MAI-004': { name: 'Smart Kettle', shortDescription: 'Precise temperature control', description: 'A connected kettle with adjustable temperature and a premium design.' },
  'MOD-004': { name: 'Premium T-shirt', shortDescription: 'A modern fit', description: 'A premium cotton T-shirt for a clean, comfortable look.' },
  'ELE-005': { name: 'Mechanical Keyboard', shortDescription: 'A better typing experience', description: 'A compact mechanical keyboard for work and gaming.' },
  'ACC-003': { name: 'Illuminated Pendant', shortDescription: 'A standout accessory', description: 'A designer pendant with subtle lighting for evening and urban looks.' },
  'MAI-005': { name: 'Living Room Cushions', shortDescription: 'Comforting textures', description: 'A cushion set that adds comfort and texture to your living space.' },
  'ACC-004': { name: 'Skincare Gift Set', shortDescription: 'An everyday skincare routine', description: 'A complete set of face and body care products.' },
  'ELE-006': { name: 'Mini Projector', shortDescription: 'Portable cinema', description: 'A mini LED projector for presentations and movies on the go.' },
  'ACC-005': { name: 'Premium Phone Case', shortDescription: 'Refined protection', description: 'A rigid leather case with reinforced edges.' },
  'MAI-006': { name: 'Bathroom Mirror', shortDescription: 'Light and clarity', description: 'A bathroom mirror with soft, adjustable lighting.' }
};

export function getCategoryCopy(category: Pick<Category, 'slug' | 'name' | 'description'> | string) {
  const slug = typeof category === 'string' ? category : category.slug;
  const fallback = typeof category === 'string' ? category : category.name;
  return categoryCopy[slug] ?? { name: fallback, description: typeof category === 'string' ? '' : category.description ?? '' };
}

export function getProductName(sku: string, fallback: string) {
  return productCopy[sku]?.name ?? fallback;
}

export function getProductShortDescription(sku: string, fallback?: string) {
  return productCopy[sku]?.shortDescription ?? fallback ?? '';
}

export function getProductDescription(sku: string, fallback?: string) {
  return productCopy[sku]?.description ?? fallback ?? '';
}

export function getProductCopy(sku: string, fallback: ProductCopy): ProductCopy {
  return productCopy[sku] ?? fallback;
}
