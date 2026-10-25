import { z } from 'zod';

export const registerSchema = z.object({
  firstName: z.string().trim().min(2, 'First name is too short.'),
  lastName: z.string().trim().min(2, 'Last name is too short.'),
  email: z.string().trim().email('A valid email is required.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
  confirmPassword: z.string().min(8, 'Password confirmation is required.')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword']
});

export const loginSchema = z.object({
  email: z.string().trim().email('A valid email is required.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.')
});

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  search: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  inStock: z.enum(['true', 'false']).optional(),
  sort: z.enum(['newest', 'priceAsc', 'priceDesc', 'featured']).default('newest')
});

export const orderItemSchema = z.object({
  productId: z.string().regex(/^[a-f\d]{24}$/i, 'A valid product identifier is required.'),
  quantity: z.number().int().min(1).max(99)
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1).max(100),
  shippingAddress: z.object({
    fullName: z.string().min(2),
    phone: z.string().min(7),
    address: z.string().min(5),
    city: z.string().min(2),
    postalCode: z.string().min(3),
    country: z.string().min(2)
  }),
  paymentMethod: z.string().default('cash_on_delivery'),
  idempotencyKey: z.string().optional()
});

export const codPaymentConfirmationSchema = z.object({
  confirmed: z.literal(true),
  note: z.string().trim().min(5).max(500)
});

const adminProductImagesSchema = z.array(z.object({
  url: z.union([
    z.string().url(),
    z.string().regex(/^\/api\/products\/images\/[a-f\d]{24}$/i)
  ]),
  alt: z.string().default(''),
  isPrimary: z.boolean().default(false)
}));

export const adminProductSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  shortDescription: z.string().min(10),
  description: z.string().min(20),
  categoryId: z.string().min(1),
  price: z.number().min(0),
  compareAtPrice: z.number().min(0).nullable().optional(),
  sku: z.string().min(3),
  stock: z.number().int().min(0),
  images: adminProductImagesSchema.default([]),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false)
});

export const adminProductUpdateSchema = adminProductSchema.partial().extend({
  images: adminProductImagesSchema.optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional()
});

const adminCategoryImageSchema = z.union([
  z.string().url(),
  z.string().regex(/^\/api\/products\/images\/[a-f\d]{24}$/i),
  z.literal('')
]);

export const adminCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(500).optional().default(''),
  image: adminCategoryImageSchema.default(''),
  isActive: z.boolean().optional().default(true)
});

export const adminCategoryUpdateSchema = adminCategorySchema.partial().extend({
  description: z.string().max(500).optional(),
  image: adminCategoryImageSchema.optional(),
  isActive: z.boolean().optional()
});
