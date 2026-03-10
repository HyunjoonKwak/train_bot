import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ConfigRepository } from '../repositories/configRepository.js';
import { SrtClient } from '../infrastructure/external/srtClient.js';
import { KorailClient } from '../infrastructure/external/korailClient.js';
import { logger } from '../utils/logger.js';

type Provider = 'srt' | 'korail';
type LoginType = 'phone' | 'member';

function maskValue(value: string): string {
  if (!value || value.length <= 3) return value ? '***' : '';
  return value.slice(0, 3) + '*'.repeat(value.length - 3);
}

export function createTrainRoutes(): Router {
  const router = Router();
  const configRepo = new ConfigRepository();

  // GET /api/train/credentials — 저장 상태 조회 (비밀번호 마스킹)
  router.get('/credentials', requireAuth, requireRole('ADMIN'), (_req: Request, res: Response) => {
    const srtLoginType = configRepo.getValue('srt_login_type') || 'phone';
    const srtLoginId = configRepo.getValue('srt_login_id');
    const srtPassword = configRepo.getValue('srt_password');
    const korailLoginType = configRepo.getValue('korail_login_type') || 'phone';
    const korailLoginId = configRepo.getValue('korail_login_id');
    const korailPassword = configRepo.getValue('korail_password');

    res.json({
      success: true,
      data: {
        srt: {
          configured: !!(srtLoginId && srtPassword),
          loginType: srtLoginType,
          loginId: maskValue(srtLoginId),
        },
        korail: {
          configured: !!(korailLoginId && korailPassword),
          loginType: korailLoginType,
          loginId: maskValue(korailLoginId),
        },
      },
    });
  });

  // POST /api/train/credentials — 로그인 테스트 후 저장
  router.post('/credentials', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
    const { provider, loginType, loginId, password } = req.body as {
      provider?: string;
      loginType?: string;
      loginId?: string;
      password?: string;
    };

    if (!provider || !loginId || !password) {
      res.status(400).json({ success: false, error: 'provider, loginId, password 필드가 필요합니다.' });
      return;
    }

    if (provider !== 'srt' && provider !== 'korail') {
      res.status(400).json({ success: false, error: "provider는 'srt' 또는 'korail'이어야 합니다." });
      return;
    }

    const resolvedLoginType: LoginType = loginType === 'member' ? 'member' : 'phone';

    try {
      // Test login with temporary client
      if (provider === 'srt') {
        const client = new SrtClient(loginId, password, resolvedLoginType);
        await (client as any).login();
      } else {
        const client = new KorailClient(loginId, password, resolvedLoginType);
        await (client as any).login();
      }

      // Login succeeded — save to DB
      const userId = req.user!.id;
      configRepo.upsert(`${provider}_login_type`, resolvedLoginType, undefined, userId);
      configRepo.upsert(`${provider}_login_id`, loginId, undefined, userId);
      configRepo.upsert(`${provider}_password`, password, undefined, userId);

      logger.info(`Train credentials saved for ${provider}`, { userId });
      res.json({ success: true, message: `${provider.toUpperCase()} 연결 성공 — 자격증명이 저장되었습니다.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : '로그인에 실패했습니다.';
      const stack = err instanceof Error ? err.stack : undefined;
      logger.error(`Train credential test failed for ${provider}`, { error: message, stack });
      res.json({ success: false, error: message });
    }
  });

  // DELETE /api/train/credentials/:provider — 자격증명 초기화
  router.delete('/credentials/:provider', requireAuth, requireRole('ADMIN'), (req: Request, res: Response) => {
    const provider = req.params.provider as string;

    if (provider !== 'srt' && provider !== 'korail') {
      res.status(400).json({ success: false, error: "provider는 'srt' 또는 'korail'이어야 합니다." });
      return;
    }

    const userId = req.user!.id;
    configRepo.updateValue(`${provider}_login_type`, 'phone', userId);
    configRepo.updateValue(`${provider}_login_id`, '', userId);
    configRepo.updateValue(`${provider}_password`, '', userId);

    logger.info(`Train credentials cleared for ${provider}`, { userId });
    res.json({ success: true, message: `${provider.toUpperCase()} 연결이 해제되었습니다.` });
  });

  return router;
}
