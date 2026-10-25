import type { NextFunction, Response } from 'express';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

import Product from '../models/Product.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { AppError } from '../utils/errors.js';
import { successResponse } from '../utils/apiResponse.js';
import { codPaymentConfirmationSchema, createOrderSchema } from '../validators/schemas.js';
import type { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { calculateShippingCost } from '../services/shippingService.js';
import { sendDeliveryConfirmationEmail, sendOrderConfirmationEmail, sendPaymentConfirmationEmail, sendShipmentNotificationEmail } from '../services/emailService.js';
import { clearCart as clearUserCart } from '../services/cartService.js';
import { env } from '../config/env.js';
import { roundMoney } from '../services/currencyService.js';

export async function createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required.'));
    }

    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(400, 'Validation failed.', parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))));
    }

    const { items, shippingAddress, paymentMethod, idempotencyKey } = parsed.data;
    if (paymentMethod !== 'cash_on_delivery') {
      return next(new AppError(400, 'Only cash on delivery is currently supported. No online payment provider is configured.'));
    }

    if (!items.length) {
      return next(new AppError(400, 'Cart is empty.'));
    }

    const existingOrder = idempotencyKey ? await Order.findOne({ userId: req.user.id, idempotencyKey }) : null;
    if (existingOrder) {
      try {
        await clearUserCart(req.user.id);
      } catch {
        console.error(`Cart cleanup failed for existing order ${existingOrder.orderNumber}.`);
      }
      return res.status(200).json(successResponse('Order already created.', existingOrder));
    }

    const normalizedItems = [...items.reduce((aggregated, item) => {
      aggregated.set(item.productId, (aggregated.get(item.productId) ?? 0) + item.quantity);
      return aggregated;
    }, new Map<string, number>())].map(([productId, quantity]) => ({ productId, quantity }));
    if (normalizedItems.some((item) => item.quantity > 99)) {
      return next(new AppError(400, 'A cart may contain no more than 99 units of each product.'));
    }
    const productIds = normalizedItems.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds }, isActive: true });
    const productMap = new Map(products.map((product) => [String(product._id), product]));

    let subtotal = 0;
    const snapshotItems: Array<Record<string, unknown>> = [];

    for (const item of normalizedItems) {
      const product = productMap.get(item.productId);
      if (!product) {
        return next(new AppError(404, `Product ${item.productId} not found or inactive.`));
      }
      if (item.quantity > product.stock) {
        return next(new AppError(409, `Insufficient stock for ${product.name}.`));
      }

      const unitPrice = roundMoney(product.price);
      const lineTotal = roundMoney(unitPrice * item.quantity);
      subtotal = roundMoney(subtotal + lineTotal);
      snapshotItems.push({
        productId: product._id,
        name: product.name,
        sku: product.sku,
        image: product.images[0]?.url ?? '',
        unitPrice,
        quantity: item.quantity,
        lineTotal
      });
    }

    const shippingQuote = calculateShippingCost({ subtotal, country: shippingAddress.country });
    if (!shippingQuote.supported) {
      return next(new AppError(400, shippingQuote.message));
    }

    const shippingCost = shippingQuote.amount;
    const discountTotal = 0;
    const total = roundMoney(subtotal + shippingCost - discountTotal);

    const decremented: Array<{ productId: string; quantity: number }> = [];
    try {
      for (const item of normalizedItems) {
        const product = await Product.findOneAndUpdate(
          { _id: item.productId, isActive: true, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { new: true }
        );
        if (!product) {
          throw new AppError(409, 'Stock changed while the order was being placed. Please review your cart.');
        }
        decremented.push(item);
      }
    } catch (error) {
      await Promise.all(decremented.map(({ productId, quantity }) =>
        Product.updateOne({ _id: productId }, { $inc: { stock: quantity } })
      ));
      throw error;
    }

    let order;
    try {
      order = await Order.create({
        userId: req.user.id,
        orderNumber: `CA-${Date.now()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
        items: snapshotItems,
        shippingAddress,
        subtotal,
        discountTotal,
        shippingCost,
        total,
        currency: 'EUR',
        paymentMethod,
        paymentStatus: 'pending',
        status: 'pending',
        shippingStatus: 'pending',
        shippingHistory: [{ status: 'pending', changedAt: new Date(), changedBy: req.user.id }],
        emailEvents: [],
        idempotencyKey: idempotencyKey ?? uuidv4()
      });
    } catch (error) {
      await Promise.all(decremented.map(({ productId, quantity }) =>
        Product.updateOne({ _id: productId }, { $inc: { stock: quantity } })
      ));
      throw error;
    }

    try {
      await clearUserCart(req.user.id);
    } catch {
      console.error(`Cart cleanup failed after order ${order.orderNumber} was created.`);
    }

    const user = await User.findById(req.user.id).select('email');
    if (user && !order.emailEvents.includes('order-confirmation')) {
      const emailResult = await sendOrderConfirmationEmail({
        email: user.email,
        orderNumber: order.orderNumber,
        total: order.total,
        previewUrl: `${env.FRONTEND_URL.replace(/\/$/, '')}/account`
      });

      if (emailResult.ok) {
        order.emailEvents = [...new Set([...order.emailEvents, 'order-confirmation'])];
        await order.save();
      } else {
        console.error(`Order confirmation email was not sent for order ${order.orderNumber}.`);
      }
    }

    return res.status(201).json(successResponse('Order created successfully.', order));
  } catch (error) {
    return next(error);
  }
}

export async function confirmCashOnDeliveryPayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError(403, 'Admin privileges required.'));
    }

    const parsed = codPaymentConfirmationSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(400, 'Validation failed.', parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message
      }))));
    }

    const existingOrder = await Order.findById(req.params.id).select('paymentMethod status shippingStatus paymentStatus');
    if (!existingOrder) return next(new AppError(404, 'Order not found.'));
    if (existingOrder.paymentMethod !== 'cash_on_delivery') {
      return next(new AppError(400, 'Cash collection confirmation is only valid for cash-on-delivery orders.'));
    }
    if (existingOrder.status !== 'delivered' || existingOrder.shippingStatus !== 'delivered') {
      return next(new AppError(409, 'Cash can only be confirmed after the order is delivered.'));
    }
    if (existingOrder.paymentStatus !== 'pending') {
      return next(new AppError(409, 'Payment has already been recorded.'));
    }

    const order = await Order.findOneAndUpdate(
      {
        _id: existingOrder._id,
        paymentMethod: 'cash_on_delivery',
        status: 'delivered',
        shippingStatus: 'delivered',
        paymentStatus: 'pending'
      },
      {
        $set: { paymentStatus: 'paid' },
        $push: {
          paymentHistory: {
            status: 'paid',
            method: 'cash_on_delivery',
            changedAt: new Date(),
            changedBy: new mongoose.Types.ObjectId(req.user.id),
            note: parsed.data.note
          }
        }
      },
      { new: true, runValidators: true }
    ).populate('userId', 'email');
    if (!order) return next(new AppError(409, 'Payment has already been recorded or the order state changed.'));

    const customerEmail = typeof order.userId === 'object' && order.userId && 'email' in order.userId
      ? String(order.userId.email)
      : '';
    if (customerEmail && !order.emailEvents.includes('payment-confirmation')) {
      const emailResult = await sendPaymentConfirmationEmail({
        email: customerEmail,
        orderNumber: order.orderNumber,
        total: order.total
      });
      if (emailResult.ok) {
        order.emailEvents = [...new Set([...order.emailEvents, 'payment-confirmation'])];
        await order.save();
      } else {
        console.error(`Payment confirmation email was not sent for order ${order.orderNumber}.`);
      }
    }

    return res.json(successResponse('Cash-on-delivery payment recorded.', order));
  } catch (error) {
    return next(error);
  }
}

export async function getMyOrders(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required.'));
    }

    const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
    return res.json(successResponse('Orders loaded.', orders));
  } catch (error) {
    return next(error);
  }
}

export async function getOrderById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required.'));
    }

    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) {
      return next(new AppError(404, 'Order not found.'));
    }

    if (req.user.role !== 'admin' && String(order.userId) !== req.user.id) {
      return next(new AppError(403, 'You cannot access this order.'));
    }

    return res.json(successResponse('Order loaded.', order));
  } catch (error) {
    return next(error);
  }
}

export async function getAdminOrders(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 }).populate('userId', 'firstName lastName email');
    return res.json(successResponse('Admin orders loaded.', orders));
  } catch (error) {
    return next(error);
  }
}

export async function updateOrderStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError(403, 'Admin privileges required.'));
    }

    const { id } = req.params;
    const { status } = req.body as { status?: string };
    if ('paymentStatus' in req.body) {
      return next(new AppError(400, 'Payment status can only be changed by a verified payment provider. No payment provider is configured.'));
    }
    const order = await Order.findById(id).populate('userId', 'email');
    if (!order) {
      return next(new AppError(404, 'Order not found.'));
    }

    type OrderStatus = (typeof order)['status'];

    const allowed: Record<OrderStatus, OrderStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: []
    };

    const nextStatus = status as OrderStatus | undefined;
    if (!nextStatus || !allowed[order.status]?.includes(nextStatus)) {
      return next(new AppError(400, 'Invalid order status transition.'));
    }

    order.status = nextStatus;
    const shippingStatus = nextStatus;
    if (order.shippingStatus !== shippingStatus) {
      order.shippingStatus = shippingStatus;
      order.shippingHistory.push({
        status: shippingStatus,
        changedAt: new Date(),
        changedBy: req.user.id
      });
    }
    if (nextStatus === 'shipped') order.shippedAt = new Date();
    if (nextStatus === 'delivered') order.deliveredAt = new Date();
    await order.save();

    if (nextStatus === 'shipped' && !order.emailEvents.includes('shipment-notice')) {
      const customerEmail = typeof order.userId === 'object' && order.userId && 'email' in order.userId ? String(order.userId.email) : '';
      if (customerEmail) {
        const emailResult = await sendShipmentNotificationEmail({
          email: customerEmail,
          orderNumber: order.orderNumber
        });
        if (emailResult.ok) {
          order.emailEvents = [...new Set([...order.emailEvents, 'shipment-notice'])];
        } else {
          console.error(`Shipment notification email was not sent for order ${order.orderNumber}.`);
        }
      }

    }

    if (nextStatus === 'delivered' && !order.emailEvents.includes('delivery-notice')) {
      const customerEmail = typeof order.userId === 'object' && order.userId && 'email' in order.userId ? String(order.userId.email) : '';
      if (customerEmail) {
        const emailResult = await sendDeliveryConfirmationEmail({
          email: customerEmail,
          orderNumber: order.orderNumber
        });
        if (emailResult.ok) {
          order.emailEvents = [...new Set([...order.emailEvents, 'delivery-notice'])];
        } else {
          console.error(`Delivery notification email was not sent for order ${order.orderNumber}.`);
        }
      }
    }

    if (nextStatus === 'shipped' || nextStatus === 'delivered') {
      await order.save();
    }

    return res.json(successResponse('Order status updated successfully.', order));
  } catch (error) {
    return next(error);
  }
}
