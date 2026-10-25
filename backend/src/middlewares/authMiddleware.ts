import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import User from '../models/User.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'customer' | 'admin';
  };
}

export async function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      throw new AppError(401, 'Authentication required.');
    }

    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string; email: string; role: 'customer' | 'admin' };
    const user = await User.findById(payload.sub).select('-passwordHash');

    if (!user || !user.isActive) {
      throw new AppError(401, 'Session invalid or account disabled.');
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function requireAdmin(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return next(new AppError(403, 'Admin privileges required.'));
  }

  return next();
}
