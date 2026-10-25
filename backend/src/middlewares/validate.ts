import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return next({
        statusCode: 400,
        message: 'Validation failed.',
        errors: result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
      });
    }

    req.body = result.data;
    return next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return next({
        statusCode: 400,
        message: 'Query validation failed.',
        errors: result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
      });
    }

    req.query = result.data as any;
    return next();
  };
}
