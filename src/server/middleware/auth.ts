import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../types/index.js';
import { UserRepository } from '../repositories/userRepository.js';

// Cached debug user to avoid repeated DB queries per request
let cachedDebugUser: { id: number; kakaoId: string; nickname: string; profileImage: string | null; role: UserRole } | null = null;

export function getDebugUser() {
  if (!cachedDebugUser) {
    const repo = new UserRepository();
    const user = repo.upsertByKakaoId('debug', 'Debug User', null);
    cachedDebugUser = { id: user.id, kakaoId: user.kakao_id, nickname: user.nickname, profileImage: user.profile_image, role: user.role as UserRole };
  }
  return cachedDebugUser;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // TODO: 디버깅 완료 후 인증 체크 복원할 것
  if (!req.user) {
    req.user = getDebugUser();
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
