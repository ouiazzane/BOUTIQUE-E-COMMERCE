import type { NextFunction, Request, Response } from 'express';

import Product from '../models/Product.js';
import { calculateShippingCost, normalizeCountryCode, SUPPORTED_SHIPPING_COUNTRIES } from '../services/shippingService.js';
import { roundMoney } from '../services/currencyService.js';
import { successResponse } from '../utils/apiResponse.js';
import { AppError } from '../utils/errors.js';

export function getShippingConfig(_req: Request, res: Response) {
  return res.json(successResponse('Shipping configuration loaded.', {
    supportedCountries: [...SUPPORTED_SHIPPING_COUNTRIES],
    defaultCountry: SUPPORTED_SHIPPING_COUNTRIES.has('MA') ? 'MA' : [...SUPPORTED_SHIPPING_COUNTRIES][0] ?? '',
    currency: 'EUR'
  }));
}

export async function quoteShipping(req: Request, res: Response, next: NextFunction) {
  try {
    const { items, country } = req.body as {
      items?: Array<{ productId: string; quantity: number }>;
      country?: string;
    };

    if (!Array.isArray(items) || items.length === 0 || !country) {
      return next(new AppError(400, 'Cart items and destination country are required.'));
    }
    if (items.some((item) => !item || !/^[a-f\d]{24}$/i.test(item.productId) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)) {
      return next(new AppError(400, 'Cart item identifiers or quantities are invalid.'));
    }

    const aggregated = new Map<string, number>();
    for (const item of items) {
      aggregated.set(item.productId, (aggregated.get(item.productId) ?? 0) + item.quantity);
    }
    if ([...aggregated.values()].some((quantity) => quantity > 99)) {
      return next(new AppError(400, 'A cart may contain no more than 99 units of each product.'));
    }

    const products = await Product.find({
      _id: { $in: [...aggregated.keys()] },
      isActive: true
    }).select('_id price stock');
    const productById = new Map(products.map((product) => [String(product._id), product]));
    let subtotal = 0;
    const pricedItems: Array<{ productId: string; quantity: number; unitPrice: number; lineTotal: number }> = [];
    for (const [productId, quantity] of aggregated) {
      const product = productById.get(productId);
      if (!product) return next(new AppError(404, 'A cart product is unavailable.'));
      if (quantity > product.stock) return next(new AppError(409, 'A cart quantity exceeds available stock.'));
      const unitPrice = roundMoney(product.price);
      const lineTotal = roundMoney(unitPrice * quantity);
      subtotal = roundMoney(subtotal + lineTotal);
      pricedItems.push({ productId, quantity, unitPrice, lineTotal });
    }

    const quote = calculateShippingCost({ subtotal, country });
    if (!quote.supported) return next(new AppError(400, quote.message));
    return res.json(successResponse('Shipping quote calculated.', {
      subtotal,
      shippingCost: quote.amount,
      total: roundMoney(subtotal + quote.amount),
      items: pricedItems,
      currency: 'EUR',
      country: normalizeCountryCode(country),
      freeShippingThreshold: quote.freeShippingThreshold
    }));
  } catch (error) {
    return next(error);
  }
}
