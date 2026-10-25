import { Router } from 'express';

import { checkAdminSmtp, getAdminCategories, getAdminProducts, getAdminUsers, getDashboardStats, sendAdminSmtpTest } from '../controllers/adminController.js';
import { confirmCashOnDeliveryPayment, getAdminOrders, updateOrderStatus } from '../controllers/orderController.js';
import { requireAdmin, requireAuth } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/stats', requireAuth, requireAdmin, getDashboardStats);
router.get('/products', requireAuth, requireAdmin, getAdminProducts);
router.get('/categories', requireAuth, requireAdmin, getAdminCategories);
router.get('/users', requireAuth, requireAdmin, getAdminUsers);
router.get('/orders', requireAuth, requireAdmin, getAdminOrders);
router.patch('/orders/:id/status', requireAuth, requireAdmin, updateOrderStatus);
router.patch('/orders/:id/payment/cash-on-delivery', requireAuth, requireAdmin, confirmCashOnDeliveryPayment);
router.get('/email/smtp-check', requireAuth, requireAdmin, checkAdminSmtp);
router.post('/email/test', requireAuth, requireAdmin, sendAdminSmtpTest);

export default router;
