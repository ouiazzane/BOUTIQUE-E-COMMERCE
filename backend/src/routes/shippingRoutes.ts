import { Router } from 'express';

import { getShippingConfig, quoteShipping } from '../controllers/shippingController.js';

const router = Router();

router.get('/config', getShippingConfig);
router.post('/quote', quoteShipping);

export default router;
