import multer from 'multer';
import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../utils/errors.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      callback(new AppError(415, 'Unsupported image format. Use JPG, PNG, or WebP.'));
      return;
    }
    callback(null, true);
  }
});

export function receiveProductImage(req: Request, res: Response, next: NextFunction) {
  upload.single('image')(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError(413, 'Image is too large. Maximum size is 5 MB.'));
      }
      return next(new AppError(400, 'The image file could not be received.'));
    }
    if (error) return next(error);
    return next();
  });
}
