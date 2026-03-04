import { Router } from 'express';
import type { Request, Response } from 'express';
import { WeekPlanService } from '../services/weekPlanService.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { updateWeekPlanSchema, bulkUpdateWeekPlanSchema, weekPlanParamSchema } from '../schemas/index.js';

const router = Router();
const weekPlanService = new WeekPlanService();

/** Get KST date string (YYYY-MM-DD) */
function kstDateString(d: Date = new Date()): string {
  return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
}

// GET /api/week-plans — get week plans for date range
router.get('/', requireAuth, (req: Request, res: Response) => {
  const startDate = (req.query.startDate as string) ?? kstDateString();
  const endDate = (req.query.endDate as string) ?? (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return kstDateString(d);
  })();

  const plans = weekPlanService.getWeekPlans(req.user!.id, startDate, endDate);
  res.json({ success: true, data: plans });
});

// GET /api/week-plans/upcoming — upcoming plans needing action
router.get('/upcoming', requireAuth, (req: Request, res: Response) => {
  const plans = weekPlanService.getUpcoming(req.user!.id);
  res.json({ success: true, data: plans });
});

// PUT /api/week-plans/:date/:direction — update a single plan
router.put('/:date/:direction', requireAuth, validateParams(weekPlanParamSchema), validateBody(updateWeekPlanSchema), (req: Request, res: Response) => {
  weekPlanService.updatePlan(
    req.user!.id,
    req.params.date as string,
    req.params.direction as string,
    req.body.status,
    req.body.preferredTime,
    req.body.trainInfo,
  );
  res.json({ success: true, message: '주간 계획이 업데이트되었습니다.' });
});

// POST /api/week-plans/bulk — bulk update plans
router.post('/bulk', requireAuth, validateBody(bulkUpdateWeekPlanSchema), (req: Request, res: Response) => {
  weekPlanService.bulkUpdate(req.user!.id, req.body.plans);
  res.json({ success: true, message: `${req.body.plans.length}개의 계획이 업데이트되었습니다.` });
});

export default router;
