import { Router } from 'express';

import {
  addCurrentCartItem,
  clearCurrentCart,
  getCurrentCart,
  mergeCurrentCart,
  removeCurrentCartItem,
  replaceCurrentCart,
  updateCurrentCartItem
} from '../controllers/cartController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(requireAuth);
router.get('/', getCurrentCart);
router.put('/', replaceCurrentCart);
router.post('/merge', mergeCurrentCart);
router.post('/items', addCurrentCartItem);
router.patch('/items/:productId', updateCurrentCartItem);
router.delete('/items/:productId', removeCurrentCartItem);
router.delete('/', clearCurrentCart);

export default router;
