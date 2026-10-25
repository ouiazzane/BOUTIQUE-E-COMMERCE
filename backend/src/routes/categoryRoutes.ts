import { Router } from 'express';

import { createCategory, deleteCategory, getCategories, getCategoryBySlug, updateCategory } from '../controllers/categoryController.js';
import { requireAdmin, requireAuth } from '../middlewares/authMiddleware.js';
import { validateBody } from '../middlewares/validate.js';
import { adminCategorySchema, adminCategoryUpdateSchema } from '../validators/schemas.js';

const router = Router();

router.get('/', getCategories);
router.get('/:slug', getCategoryBySlug);

router.post('/', requireAuth, requireAdmin, validateBody(adminCategorySchema), createCategory);
router.patch('/:id', requireAuth, requireAdmin, validateBody(adminCategoryUpdateSchema), updateCategory);
router.delete('/:id', requireAuth, requireAdmin, deleteCategory);

export default router;
