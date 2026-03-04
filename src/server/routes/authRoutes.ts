import { Router } from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';
import { KakaoAuthClient } from '../infrastructure/external/kakaoAuth.js';
import { UserService } from '../services/userService.js';
import { AuditService } from '../services/auditService.js';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const kakao = new KakaoAuthClient();
const userService = new UserService();
const auditService = new AuditService();

// OAuth router — mounted at /auth (for Kakao redirects)
export const oauthRouter = Router();

// GET /auth/kakao — redirect to Kakao OAuth
oauthRouter.get('/kakao', (req: Request, res: Response) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;
  req.session.save((err) => {
    if (err) {
      logger.error('Failed to save OAuth state to session', { error: err });
      res.redirect('/?error=session_error');
      return;
    }
    res.redirect(kakao.getAuthUrl(state));
  });
});

// GET /auth/kakao/callback — handle OAuth callback
oauthRouter.get('/kakao/callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    const state = req.query.state as string;
    const expectedState = req.session.oauthState;

    if (!code || !state || state !== expectedState) {
      res.redirect('/?error=invalid_state');
      return;
    }
    delete req.session.oauthState;

    const tokenData = await kakao.getToken(code);
    const kakaoUser = await kakao.getUserInfo(tokenData.access_token);
    const user = userService.findOrCreateByKakao(kakaoUser.kakaoId, kakaoUser.nickname, kakaoUser.profileImage);

    if (!user.is_active) {
      res.redirect('/?error=inactive_user');
      return;
    }

    // Set session
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      kakaoId: user.kakao_id,
      nickname: user.nickname,
      profileImage: user.profile_image,
      role: user.role as 'ADMIN' | 'MEMBER',
    };

    res.redirect('/');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Kakao callback error', { error: message });
    res.redirect('/?error=auth_failed');
  }
});

// API auth router — mounted at /api/auth
export const authApiRouter = Router();

// GET /api/auth/me — get current user
authApiRouter.get('/me', (req: Request, res: Response) => {
  if (!req.session?.user) {
    res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
    return;
  }
  res.json({ success: true, data: req.session.user });
});

// POST /api/auth/logout
authApiRouter.post('/logout', requireAuth, (req: Request, res: Response) => {
  const userId = req.user?.id;
  req.session.destroy((err) => {
    if (err) {
      logger.error('Session destroy error', { error: err });
      res.status(500).json({ success: false, error: '로그아웃 처리 중 오류가 발생했습니다.' });
      return;
    }
    if (userId) {
      auditService.log({ userId, action: 'USER_LOGOUT' });
    }
    res.json({ success: true, message: '로그아웃 되었습니다.' });
  });
});
