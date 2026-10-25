import type { NextFunction, Response } from 'express';

import type { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { addCartItem, clearCart, getCart, mergeCart, removeCartItem, replaceCart, updateCartItem } from '../services/cartService.js';
import { successResponse } from '../utils/apiResponse.js';
import { AppError } from '../utils/errors.js';

function currentUserId(req: AuthenticatedRequest): string {
  if (!req.user) throw new AppError(401, 'Authentication required.');
  return req.user.id;
}

export async function getCurrentCart(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    return res.json(successResponse('Cart loaded.', await getCart(currentUserId(req))));
  } catch (error) {
    return next(error);
  }
}

export async function replaceCurrentCart(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { items } = req.body as { items?: Array<{ productId: string; quantity: number }> };
    if (!Array.isArray(items)) return next(new AppError(400, 'Cart items are required.'));
    return res.json(successResponse('Cart saved.', await replaceCart(currentUserId(req), items)));
  } catch (error) {
    return next(error);
  }
}

export async function mergeCurrentCart(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { items, mergeId } = req.body as {
      items?: Array<{ productId: string; quantity: number }>;
      mergeId?: string;
    };
    if (!Array.isArray(items)) return next(new AppError(400, 'Cart items are required.'));
    return res.json(successResponse('Cart merged.', await mergeCart(currentUserId(req), items, mergeId ?? '')));
  } catch (error) {
    return next(error);
  }
}

export async function addCurrentCartItem(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { productId, quantity } = req.body as { productId?: string; quantity?: number };
    return res.json(successResponse('Cart item added.', await addCartItem(currentUserId(req), {
      productId: productId ?? '',
      quantity: quantity ?? 0
    })));
  } catch (error) {
    return next(error);
  }
}

export async function updateCurrentCartItem(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { quantity } = req.body as { quantity?: number };
    const productId = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;
    return res.json(successResponse('Cart item updated.', await updateCartItem(currentUserId(req), productId, quantity ?? 0)));
  } catch (error) {
    return next(error);
  }
}

export async function removeCurrentCartItem(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const productId = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;
    return res.json(successResponse('Cart item removed.', await removeCartItem(currentUserId(req), productId)));
  } catch (error) {
    return next(error);
  }
}

export async function clearCurrentCart(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    return res.json(successResponse('Cart cleared.', await clearCart(currentUserId(req))));
  } catch (error) {
    return next(error);
  }
}
