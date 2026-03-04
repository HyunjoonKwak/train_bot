import { Router } from 'express';
import type { Request, Response } from 'express';
import { ConfigService } from '../services/configService.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { updateConfigSchema, configKeyParamSchema } from '../schemas/index.js';

const router = Router();
const configService = new ConfigService();

// GET /api/config — list all config
router.get('/', requireAuth, (_req: Request, res: Response) => {
  const configs = configService.getAll();
  res.json({ success: true, data: configs });
});

// PUT /api/config/:key — update a config value (admin only)
router.put('/:key', requireAuth, requireRole('ADMIN'), validateParams(configKeyParamSchema), validateBody(updateConfigSchema), (req: Request, res: Response) => {
  configService.updateValue(req.params.key as string, req.body.value, req.user!.id);
  res.json({ success: true, message: '설정이 업데이트되었습니다.' });
});

export default router;
