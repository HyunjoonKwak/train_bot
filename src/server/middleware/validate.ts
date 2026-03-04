import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema, ZodError } from 'zod';

function formatZodError(error: ZodError): string {
  return error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
}

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ success: false, error: formatZodError(result.error) });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({ success: false, error: formatZodError(result.error) });
      return;
    }
    req.validatedQuery = result.data;
    next();
  };
}

export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({ success: false, error: formatZodError(result.error) });
      return;
    }
    req.params = result.data;
    next();
  };
}
