import type { NextFunction, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import User from '../models/User.js';
import PasswordResetToken from '../models/PasswordResetToken.js';
import { registerSchema, loginSchema } from '../validators/schemas.js';
import { AppError } from '../utils/errors.js';
import { successResponse } from '../utils/apiResponse.js';
import type { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { sendPasswordResetEmail } from '../services/emailService.js';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.COOKIE_SECURE,
  maxAge: 7 * 24 * 60 * 60 * 1000
};

export async function registerUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(400, 'Validation failed.', parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))));
    }

    const { firstName, lastName, email, password, confirmPassword } = parsed.data;
    if (password !== confirmPassword) {
      return next(new AppError(400, 'Passwords do not match.'));
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return next(new AppError(409, 'Email already in use.'));
    }

    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      passwordHash: password,
      role: 'customer',
      isActive: true,
      emailVerified: false
    });

    const token = jwt.sign({ sub: user._id.toString(), email: user.email, role: user.role }, env.JWT_ACCESS_SECRET, { expiresIn: '7d' });

    res.cookie('auth_token', token, cookieOptions);

    return res.status(201).json(successResponse('Account created successfully.', {
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    }));
  } catch (error) {
    return next(error);
  }
}

export async function loginUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(400, 'Validation failed.', parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))));
    }

    const { email, password } = parsed.data;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || !user.isActive) {
      return next(new AppError(401, 'Invalid credentials.'));
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return next(new AppError(401, 'Invalid credentials.'));
    }

    const token = jwt.sign({ sub: user._id.toString(), email: user.email, role: user.role }, env.JWT_ACCESS_SECRET, { expiresIn: '7d' });
    res.cookie('auth_token', token, cookieOptions);

    return res.json(successResponse('Login successful.', {
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    }));
  } catch (error) {
    return next(error);
  }
}

export async function logoutUser(_req: AuthenticatedRequest, res: Response) {
  res.clearCookie('auth_token');
  return res.json(successResponse('Logged out successfully.', null));
}

export async function getCurrentUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required.'));
    }

    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user || !user.isActive) {
      return next(new AppError(401, 'Session invalid.'));
    }

    return res.json(successResponse('User profile loaded.', {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified
    }));
  } catch (error) {
    return next(error);
  }
}

export async function forgotPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { email } = req.body as { email?: string };
    if (!email) {
      return next(new AppError(400, 'Email is required.'));
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.json(successResponse('If an account exists, a reset link will be sent.', null));
    }

    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
      return res.json(successResponse('Password reset is configured, but SMTP is not enabled. Configure SMTP to send reset emails.', null));
    }

    const token = jwt.sign({ sub: user._id.toString(), purpose: 'password-reset' }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
    const tokenHash = await bcrypt.hash(token, 10);

    await PasswordResetToken.create({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000)
    });

    const resetUrl = `${env.FRONTEND_URL.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
    const emailResult = await sendPasswordResetEmail({ email: user.email, resetUrl });

    if (!emailResult.ok) {
      return res.json(successResponse(emailResult.skipped
        ? 'SMTP is not configured. No password reset email was sent.'
        : 'Password reset email delivery failed. Please retry later.', { sent: false }));
    }

    return res.json(successResponse('Password reset email sent.', { sent: true }));
  } catch (error) {
    return next(error);
  }
}

export async function resetPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { token, password } = req.body as { token?: string; password?: string };
    if (!token || !password) {
      return next(new AppError(400, 'Token and new password are required.'));
    }
    if (password.length < 8) {
      return next(new AppError(400, 'Password must be at least 8 characters long.'));
    }

    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string; purpose: string };
    if (decoded.purpose !== 'password-reset') {
      return next(new AppError(400, 'Invalid reset token.'));
    }

    const resetRecord = await PasswordResetToken.findOne({ userId: decoded.sub, usedAt: null, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
    if (!resetRecord) {
      return next(new AppError(400, 'Reset token expired or already used.'));
    }

    const matches = await bcrypt.compare(token, resetRecord.tokenHash);
    if (!matches) {
      return next(new AppError(400, 'Invalid reset token.'));
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      return next(new AppError(404, 'User not found.'));
    }

    user.passwordHash = password;
    await user.save();
    await PasswordResetToken.updateOne({ _id: resetRecord._id }, { usedAt: new Date() });

    return res.json(successResponse('Password updated successfully.', null));
  } catch (error) {
    return next(error);
  }
}
