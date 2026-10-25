import { Router } from 'express';

import { createOrder, getMyOrders, getOrderById } from '../controllers/orderController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/', requireAuth, createOrder);
router.get('/my-orders', requireAuth, getMyOrders);
router.get('/:id', requireAuth, getOrderById);

export default router;
