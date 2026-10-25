export type Category = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  isActive?: boolean;
};

export type ProductImage = {
  url: string;
  alt?: string;
  isPrimary?: boolean;
};

export type Product = {
  _id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  categoryId: Category | string;
  price: number;
  compareAtPrice?: number | null;
  sku: string;
  stock: number;
  images: ProductImage[];
  isActive?: boolean;
  isFeatured?: boolean;
  createdAt?: string;
};

export type CartItem = {
  productId: string;
  quantity: number;
  product: Product;
};

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type UserProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'admin';
  isActive?: boolean;
  emailVerified?: boolean;
};
