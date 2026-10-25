import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';

import authRoutes from './routes/authRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import shippingRoutes from './routes/shippingRoutes.js';
import { errorMiddleware } from './middlewares/errorMiddleware.js';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const productImageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../uploads/product-images');

app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(helmet());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.use('/uploads/product-images', (_req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(productImageDirectory, {
  fallthrough: true,
  maxAge: '1d',
  dotfiles: 'deny',
  index: false
}));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get('/api/health', (_req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  const status = dbConnected ? 'connected' : 'disconnected';
  res.status(dbConnected ? 200 : 503).json({
    success: dbConnected,
    message: 'Server health status.',
    data: {
      status,
      dbConnected,
      nodeEnv: process.env.NODE_ENV ?? 'development'
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

app.use(errorMiddleware);

export default app;
