import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../types/index.js';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
    return;
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: '권한이 없습니다.' });
      return;
    }
    next();
  };
}
