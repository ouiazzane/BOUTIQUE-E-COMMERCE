import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';

import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Category from '../models/Category.js';
import { AppError } from '../utils/errors.js';
import { successResponse } from '../utils/apiResponse.js';

export async function getProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 12);
    const search = String(req.query.search ?? '').trim();
    const category = String(req.query.category ?? '');
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
    const inStock = req.query.inStock ? String(req.query.inStock) === 'true' : undefined;
    const sort = String(req.query.sort ?? 'newest');

    const filter: Record<string, unknown> = { isActive: true };

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }
    if (category) {
      if (mongoose.isValidObjectId(category)) {
        filter.categoryId = category;
      } else {
        const matchingCategory = await Category.findOne({ slug: category, isActive: true }).select('_id').lean();
        filter.categoryId = matchingCategory?._id ?? new mongoose.Types.ObjectId();
      }
    }
    if (typeof minPrice === 'number' && !Number.isNaN(minPrice)) {
      filter.price = { ...(filter.price as Record<string, number> ?? {}), $gte: minPrice };
    }
    if (typeof maxPrice === 'number' && !Number.isNaN(maxPrice)) {
      filter.price = { ...(filter.price as Record<string, number> ?? {}), $lte: maxPrice };
    }
    if (inStock !== undefined) {
      filter.stock = inStock ? { $gt: 0 } : { $eq: 0 };
    }

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      newest: { createdAt: -1 },
      priceAsc: { price: 1 },
      priceDesc: { price: -1 },
      featured: { isFeatured: -1, createdAt: -1 }
    };

    const [products, total] = await Promise.all([
      Product.find(filter).populate('categoryId').sort(sortMap[sort] ?? sortMap.newest).skip((page - 1) * limit).limit(limit),
      Product.countDocuments(filter)
    ]);

    return res.json(successResponse('Products loaded.', {
      products,
      pagination: {
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        totalItems: total
      }
    }));
  } catch (error) {
    return next(error);
  }
}

export async function getProductByIdOrSlug(req: Request, res: Response, next: NextFunction) {
  try {
    const { idOrSlug } = req.params;
    const product = await Product.findOne({
      $or: [{ _id: mongoose.isValidObjectId(idOrSlug) ? idOrSlug : undefined }, { slug: idOrSlug }],
      isActive: true
    }).populate('categoryId');

    if (!product) {
      return next(new AppError(404, 'Product not found.'));
    }

    return res.json(successResponse('Product loaded.', product));
  } catch (error) {
    return next(error);
  }
}

export async function getFeaturedProducts(_req: Request, res: Response, next: NextFunction) {
  try {
    const products = await Product.find({ isActive: true, isFeatured: true }).limit(6).populate('categoryId');
    return res.json(successResponse('Featured products loaded.', products));
  } catch (error) {
    return next(error);
  }
}

export async function getRelatedProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return next(new AppError(404, 'Product not found.'));
    }

    const related = await Product.find({
      categoryId: product.categoryId,
      _id: { $ne: product._id },
      isActive: true
    }).limit(4).populate('categoryId');

    return res.json(successResponse('Related products loaded.', related));
  } catch (error) {
    return next(error);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = req.body;
    const category = await Category.findById(payload.categoryId);
    if (!category) {
      return next(new AppError(400, 'Category not found.'));
    }

    const product = await Product.create({
      ...payload,
      categoryId: payload.categoryId
    });

    return res.status(201).json(successResponse('Product created successfully.', product));
  } catch (error) {
    return next(error);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (req.body.categoryId) {
      const category = await Category.findById(req.body.categoryId);
      if (!category) {
        return next(new AppError(400, 'Category not found.'));
      }
    }

    const product = await Product.findById(id);
    if (!product) {
      return next(new AppError(404, 'Product not found.'));
    }

    Object.assign(product, req.body);
    await product.save();

    return res.json(successResponse('Product updated successfully.', product));
  } catch (error) {
    return next(error);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return next(new AppError(404, 'Product not found.'));
    }

    product.isActive = false;
    await product.save();

    return res.json(successResponse('Product disabled successfully.', null));
  } catch (error) {
    return next(error);
  }
}

export async function permanentlyDeleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return next(new AppError(400, 'Product identifier is invalid.'));
    }

    const product = await Product.findOneAndUpdate(
      { _id: id, isActive: true },
      { $set: { isActive: false } },
      { new: true }
    );
    const target = product ?? await Product.findById(id);
    if (!target) return next(new AppError(404, 'Product not found.'));

    if (await Order.exists({ 'items.productId': target._id })) {
      return next(new AppError(409, 'This product is part of an order history and cannot be permanently deleted. It has been deactivated instead.'));
    }

    await Product.deleteOne({ _id: target._id });
    await Cart.updateMany(
      { 'items.productId': target._id },
      { $pull: { items: { productId: target._id } } }
    );

    return res.json(successResponse('Product permanently deleted.', null));
  } catch (error) {
    return next(error);
  }
}
