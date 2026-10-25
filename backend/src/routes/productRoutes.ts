import { Router } from 'express';

import { createProduct, deleteProduct, getFeaturedProducts, getProductByIdOrSlug, getProducts, getRelatedProducts, permanentlyDeleteProduct, updateProduct } from '../controllers/productController.js';
import { requireAdmin, requireAuth } from '../middlewares/authMiddleware.js';
import { receiveProductImage } from '../middlewares/productImageUpload.js';
import { validateBody } from '../middlewares/validate.js';
import { adminProductSchema, adminProductUpdateSchema } from '../validators/schemas.js';
import { getProductImageById, uploadProductImage } from '../controllers/productImageController.js';

const router = Router();

router.post('/images', requireAuth, requireAdmin, receiveProductImage, uploadProductImage);
router.get('/images/:imageId', getProductImageById);
router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/:id/related', getRelatedProducts);
router.get('/:idOrSlug', getProductByIdOrSlug);

router.post('/', requireAuth, requireAdmin, validateBody(adminProductSchema), createProduct);
router.patch('/:id', requireAuth, requireAdmin, validateBody(adminProductUpdateSchema), updateProduct);
router.delete('/:id/permanent', requireAuth, requireAdmin, permanentlyDeleteProduct);
router.delete('/:id', requireAuth, requireAdmin, deleteProduct);

export default router;
