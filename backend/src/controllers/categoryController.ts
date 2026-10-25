import type { NextFunction, Request, Response } from 'express';

import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { AppError } from '../utils/errors.js';
import { successResponse } from '../utils/apiResponse.js';

export async function getCategories(_req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    return res.json(successResponse('Categories loaded.', categories));
  } catch (error) {
    return next(error);
  }
}

export async function getCategoryBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params;
    const category = await Category.findOne({ slug, isActive: true });
    if (!category) {
      return next(new AppError(404, 'Category not found.'));
    }

    const products = await Product.find({ categoryId: category._id, isActive: true }).limit(10);
    return res.json(successResponse('Category loaded.', { category, products }));
  } catch (error) {
    return next(error);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await Category.create(req.body);
    return res.status(201).json(successResponse('Category created successfully.', category));
  } catch (error) {
    return next(error);
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) {
      return next(new AppError(404, 'Category not found.'));
    }

    Object.assign(category, req.body);
    await category.save();

    return res.json(successResponse('Category updated successfully.', category));
  } catch (error) {
    return next(error);
  }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const inUse = await Product.exists({ categoryId: id });
    if (inUse) {
      return next(new AppError(409, 'Category is in use by products and cannot be deleted.'));
    }

    const category = await Category.findById(id);
    if (!category) {
      return next(new AppError(404, 'Category not found.'));
    }

    category.isActive = false;
    await category.save();

    return res.json(successResponse('Category deactivated successfully.', null));
  } catch (error) {
    return next(error);
  }
}
