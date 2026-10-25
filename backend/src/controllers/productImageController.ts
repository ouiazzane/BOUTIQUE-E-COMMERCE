import type { NextFunction, Request, Response } from 'express';

import ProductImageAsset from '../models/ProductImageAsset.js';
import { AppError } from '../utils/errors.js';
import { successResponse } from '../utils/apiResponse.js';

function getImageContentType(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

export async function uploadProductImage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) return next(new AppError(400, 'Select an image to upload.'));

    const contentType = getImageContentType(req.file.buffer);
    if (contentType !== req.file.mimetype) {
      return next(new AppError(415, 'The file content is not a valid JPG, PNG, or WebP image.'));
    }

    const asset = await ProductImageAsset.create({
      contentType,
      data: req.file.buffer
    });

    return res.status(201).json(successResponse('Image uploaded.', {
      url: `/api/products/images/${asset._id}`,
      originalName: req.file.originalname,
      size: req.file.size
    }));
  } catch (error) {
    return next(error);
  }
}

export async function getProductImageById(req: Request, res: Response, next: NextFunction) {
  try {
    const imageId = req.params.imageId;
    if (typeof imageId !== 'string' || !/^[a-f\d]{24}$/i.test(imageId)) {
      return next(new AppError(404, 'Product image not found.'));
    }

    const asset = await ProductImageAsset.findById(imageId).select('contentType data').lean();
    if (!asset) return next(new AppError(404, 'Product image not found.'));

    res.setHeader('Content-Type', asset.contentType);
    res.setHeader('Content-Length', asset.data.length());
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    return res.end(Buffer.from(asset.data.value()));
  } catch (error) {
    return next(error);
  }
}
