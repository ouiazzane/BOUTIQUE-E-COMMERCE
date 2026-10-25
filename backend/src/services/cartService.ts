import mongoose from 'mongoose';

import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { AppError } from '../utils/errors.js';

export type CartInputItem = {
  productId: string;
  quantity: number;
};

export type CartItemValue = {
  productId: string;
  quantity: number;
};

function validateItems(items: CartInputItem[]): void {
  if (!Array.isArray(items) || items.length > 100) {
    throw new AppError(400, 'Cart must contain no more than 100 products.');
  }

  for (const item of items) {
    if (!mongoose.isValidObjectId(item.productId)) {
      throw new AppError(400, 'A cart product identifier is invalid.');
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      throw new AppError(400, 'Cart quantities must be whole numbers between 1 and 99.');
    }
  }
}

function normalizeItems(items: CartInputItem[]): CartItemValue[] {
  const quantities = new Map<string, number>();
  for (const item of items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }
  if ([...quantities.values()].some((quantity) => quantity > 99)) {
    throw new AppError(400, 'A cart may contain no more than 99 units of each product.');
  }
  return [...quantities].map(([productId, quantity]) => ({ productId, quantity }));
}

async function resolveItems(items: CartInputItem[]): Promise<CartItemValue[]> {
  validateItems(items);
  const normalized = normalizeItems(items);
  if (!normalized.length) return [];

  const products = await Product.find({
    _id: { $in: normalized.map((item) => item.productId) },
    isActive: true
  }).select('_id stock');
  const stockByProduct = new Map(products.map((product) => [String(product._id), product.stock]));

  return normalized.map((item) => {
    const stock = stockByProduct.get(item.productId);
    if (stock === undefined) {
      throw new AppError(404, 'A cart product is unavailable.');
    }
    if (stock < 1) {
      throw new AppError(409, 'A cart product is out of stock.');
    }
    if (item.quantity > stock) {
      throw new AppError(409, 'A cart quantity exceeds available stock.');
    }
    return item;
  });
}

async function getOrCreateCart(userId: string) {
  try {
    return await Cart.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId, items: [] } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    if (error instanceof mongoose.Error) throw error;
    const cart = await Cart.findOne({ userId });
    if (cart) return cart;
    throw error;
  }
}

export async function getCart(userId: string) {
  const cart = await getOrCreateCart(userId);
  const productIds = cart.items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds }, isActive: true }).lean();
  const productById = new Map(products.map((product) => [String(product._id), product]));
  const reconciled = cart.items.flatMap((item) => {
    const product = productById.get(String(item.productId));
    if (!product || product.stock < 1) return [];
    return [{
      productId: item.productId,
      quantity: Math.min(item.quantity, product.stock, 99)
    }];
  });
  if (reconciled.length !== cart.items.length || reconciled.some((item, index) => item.quantity !== cart.items[index]?.quantity)) {
    cart.set('items', reconciled);
    await cart.save();
  }
  const items = cart.items.flatMap((item) => {
    const product = productById.get(String(item.productId));
    if (!product) return [];
    return [{ productId: String(item.productId), quantity: item.quantity, product }];
  });
  return { _id: cart._id, items };
}

export async function replaceCart(userId: string, inputItems: CartInputItem[]) {
  const items = await resolveItems(inputItems);
  let cart = await getOrCreateCart(userId);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    cart.set('items', items.map((item) => ({
      productId: new mongoose.Types.ObjectId(item.productId),
      quantity: item.quantity
    })));
    try {
      await cart.save();
      return getCart(userId);
    } catch (error) {
      if (!(error instanceof mongoose.Error.VersionError) || attempt === 2) throw error;
      const latest = await Cart.findOne({ userId });
      if (!latest) throw error;
      cart = latest;
    }
  }

  throw new AppError(409, 'Cart changed concurrently. Please retry.');
}

async function mutateCart(
  userId: string,
  mutate: (items: CartItemValue[]) => CartItemValue[]
) {
  let cart = await getOrCreateCart(userId);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const currentItems = cart.items.map((item) => ({
      productId: String(item.productId),
      quantity: item.quantity
    }));
    const nextItems = await resolveItems(mutate(currentItems));
    cart.set('items', nextItems.map((item) => ({
      productId: new mongoose.Types.ObjectId(item.productId),
      quantity: item.quantity
    })));
    try {
      await cart.save();
      return getCart(userId);
    } catch (error) {
      if (!(error instanceof mongoose.Error.VersionError) || attempt === 2) throw error;
      const latest = await Cart.findOne({ userId });
      if (!latest) throw error;
      cart = latest;
    }
  }
  throw new AppError(409, 'Cart changed concurrently. Please retry.');
}

export async function mergeCart(userId: string, guestItems: CartInputItem[], mergeId: string) {
  if (!/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(mergeId)) {
    throw new AppError(400, 'A valid guest cart merge identifier is required.');
  }
  validateItems(guestItems);
  let cart = await getOrCreateCart(userId);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (cart.mergedGuestCartIds.includes(mergeId)) return getCart(userId);

    const merged = new Map<string, number>();
    for (const item of cart.items) {
      const productId = String(item.productId);
      merged.set(productId, (merged.get(productId) ?? 0) + item.quantity);
    }
    for (const item of guestItems) {
      merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
    }

    const normalized = [...merged].map(([productId, quantity]) => ({ productId, quantity }));
    const products = await Product.find({
      _id: { $in: normalized.map((item) => item.productId) },
      isActive: true
    }).select('_id stock');
    const stockByProduct = new Map(products.map((product) => [String(product._id), product.stock]));
    const mergedItems = normalized.flatMap((item) => {
      const stock = stockByProduct.get(item.productId) ?? 0;
      if (stock === 0) return [];
      return [{ ...item, quantity: Math.min(item.quantity, stock, 99) }];
    });

    cart.set('items', mergedItems.map((item) => ({
      productId: new mongoose.Types.ObjectId(item.productId),
      quantity: item.quantity
    })));
    cart.mergedGuestCartIds.push(mergeId);

    try {
      await cart.save();
      return getCart(userId);
    } catch (error) {
      if (!(error instanceof mongoose.Error.VersionError) || attempt === 2) throw error;
      const latest = await Cart.findOne({ userId });
      if (!latest) throw error;
      cart = latest;
    }
  }

  throw new AppError(409, 'Cart changed concurrently. Please retry.');
}

export async function addCartItem(userId: string, input: CartInputItem) {
  validateItems([input]);
  return mutateCart(userId, (items) => {
    const existing = items.find((item) => item.productId === input.productId);
    if (existing) existing.quantity += input.quantity;
    else items.push(input);
    return items;
  });
}

export async function updateCartItem(userId: string, productId: string, quantity: number) {
  if (!mongoose.isValidObjectId(productId)) throw new AppError(400, 'A cart product identifier is invalid.');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    throw new AppError(400, 'Cart quantities must be whole numbers between 1 and 99.');
  }
  return mutateCart(userId, (items) => {
    if (!items.some((item) => item.productId === productId)) {
      throw new AppError(404, 'Cart item not found.');
    }
    return items.map((item) => ({ ...item, quantity: item.productId === productId ? quantity : item.quantity }));
  });
}

export async function removeCartItem(userId: string, productId: string) {
  if (!mongoose.isValidObjectId(productId)) throw new AppError(400, 'A cart product identifier is invalid.');
  return mutateCart(userId, (items) => items.filter((item) => item.productId !== productId));
}

export async function clearCart(userId: string) {
  return mutateCart(userId, () => []);
}
