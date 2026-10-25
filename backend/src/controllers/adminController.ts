import type { Request, Response } from 'express';

import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import { successResponse } from '../utils/apiResponse.js';
import type { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { sendSmtpTestEmail, verifySmtpConnection } from '../services/emailService.js';

export async function getDashboardStats(_req: Request, res: Response) {
  const [activeProducts, outOfStockProducts, totalOrders, pendingOrders, customerCount, revenueData] = await Promise.all([
    Product.countDocuments({ isActive: true }),
    Product.countDocuments({ isActive: true, stock: 0 }),
    Order.countDocuments(),
    Order.countDocuments({ status: 'pending' }),
    User.countDocuments({ role: 'customer' }),
    Order.aggregate([{ $group: { _id: null, totalRevenue: { $sum: '$total' } } }])
  ]);

  const totalRevenue = revenueData[0]?.totalRevenue ?? 0;

  const recentOrders = await Order.find({}).sort({ createdAt: -1 }).limit(5).populate('userId', 'firstName lastName email');

  return res.json(successResponse('Dashboard statistics loaded.', {
    activeProducts,
    outOfStockProducts,
    totalOrders,
    pendingOrders,
    customerCount,
    totalRevenue,
    recentOrders
  }));
}

export async function checkAdminSmtp(_req: AuthenticatedRequest, res: Response) {
  const result = await verifySmtpConnection();
  return res.status(result.ok ? 200 : 503).json(successResponse(
    result.ok ? 'SMTP connection verified.' : result.reason ?? 'SMTP verification failed.',
    { configured: result.ok }
  ));
}

export async function sendAdminSmtpTest(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json(successResponse('Authentication required.', null));
  }

  const result = await sendSmtpTestEmail(req.user.email);
  if (!result.ok) {
    return res.status(result.skipped ? 503 : 502).json(successResponse(
      result.reason ?? 'SMTP test email was not sent.',
      { sent: false }
    ));
  }

  return res.json(successResponse('SMTP test email sent to the administrator account address.', {
    sent: true,
    messageId: result.messageId
  }));
}

export async function getAdminUsers(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const search = String(req.query.search ?? '').trim();
  const filter = search ? { $or: [
    { firstName: { $regex: search, $options: 'i' } },
    { lastName: { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } }
  ] } : {};
  const [users, total] = await Promise.all([
    User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter)
  ]);
  return res.json(successResponse('Users loaded.', { users, pagination: { page, limit, totalItems: total, totalPages: Math.max(1, Math.ceil(total / limit)) } }));
}

export async function getAdminProducts(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const search = String(req.query.search ?? '').trim();
  const filter = search ? { $or: [
    { name: { $regex: search, $options: 'i' } },
    { sku: { $regex: search, $options: 'i' } },
    { slug: { $regex: search, $options: 'i' } }
  ] } : {};
  const [products, total] = await Promise.all([
    Product.find(filter).populate('categoryId').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter)
  ]);
  return res.json(successResponse('Admin products loaded.', { products, pagination: { page, limit, totalItems: total, totalPages: Math.max(1, Math.ceil(total / limit)) } }));
}

export async function getAdminCategories(_req: Request, res: Response) {
  const categories = await Category.aggregate([
    {
      $lookup: {
        from: Product.collection.name,
        localField: '_id',
        foreignField: 'categoryId',
        as: 'products'
      }
    },
    {
      $project: {
        name: 1,
        slug: 1,
        description: 1,
        image: 1,
        isActive: 1,
        createdAt: 1,
        updatedAt: 1,
        productCount: { $size: '$products' }
      }
    },
    { $sort: { name: 1 } }
  ]);

  return res.json(successResponse('Admin categories loaded.', categories));
}
