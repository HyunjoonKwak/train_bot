import { Router } from 'express';
import type { Request, Response } from 'express';
import { RunService } from '../services/runService.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { createRunSchema, paginationSchema, idParamSchema } from '../schemas/index.js';
import { toCamel, toCamelArray } from '../utils/index.js';

export function createRunRoutes(): Router {
  const router = Router();
  const runService = new RunService();

  // POST /api/runs — create a manual search run
  router.post('/', requireAuth, validateBody(createRunSchema), async (req: Request, res: Response) => {
    try {
      const result = await runService.executeSearch({
        type: 'MANUAL',
        departureStation: req.body.departureStation,
        arrivalStation: req.body.arrivalStation,
        departureDate: req.body.departureDate,
        departureTimeFrom: req.body.departureTimeFrom,
        departureTimeTo: req.body.departureTimeTo,
        trainType: req.body.trainType,
        userId: req.user!.id,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      const message = err instanceof Error ? err.message : '검색 실행 중 오류가 발생했습니다.';
      res.status(500).json({ success: false, error: message });
    }
  });

  // GET /api/runs — list runs
  router.get('/', requireAuth, validateQuery(paginationSchema), (req: Request, res: Response) => {
    const { page, limit } = req.validatedQuery;
    const status = req.query.status as string | undefined;
    const { rows, total } = runService.getAll({ page, limit, status });
    res.json({
      success: true,
      data: toCamelArray(rows),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  });

  // GET /api/runs/recent — recent runs for dashboard
  router.get('/recent', requireAuth, (req: Request, res: Response) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const runs = runService.getRecent(limit);
    res.json({ success: true, data: toCamelArray(runs) });
  });

  // GET /api/runs/stats — today's stats
  router.get('/stats', requireAuth, (_req: Request, res: Response) => {
    const stats = runService.getTodayStats();
    res.json({ success: true, data: stats });
  });

  // GET /api/runs/:id — get a specific run
  router.get('/:id', requireAuth, validateParams(idParamSchema), (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const run = runService.getById(id);
    if (!run) {
      res.status(404).json({ success: false, error: '실행 기록을 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: toCamel(run as unknown as Record<string, unknown>) });
  });

  return router;
}
