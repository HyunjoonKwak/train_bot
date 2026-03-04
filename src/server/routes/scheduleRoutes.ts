import { Router } from 'express';
import type { Request, Response } from 'express';
import { ScheduleService } from '../services/scheduleService.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { createScheduleSchema, updateScheduleSchema, idParamSchema } from '../schemas/index.js';
import { CronManager } from '../infrastructure/scheduler/cronManager.js';

const router = Router();
const scheduleService = new ScheduleService();

// GET /api/schedules — list all schedules
router.get('/', requireAuth, (_req: Request, res: Response) => {
  const schedules = scheduleService.getAll();
  res.json({ success: true, data: schedules });
});

// POST /api/schedules — create a schedule (admin only)
router.post('/', requireAuth, requireRole('ADMIN'), validateBody(createScheduleSchema), (req: Request, res: Response) => {
  const id = scheduleService.create({
    ...req.body,
    createdBy: req.user!.id,
  });
  // Sync with running CronManager
  const schedule = scheduleService.getById(id);
  CronManager.getInstance().addJob(id, schedule.cron_expression, schedule.task_type, schedule.task_config);
  res.status(201).json({ success: true, data: { id }, message: '스케줄이 생성되었습니다.' });
});

// PUT /api/schedules/:id — update a schedule (admin only)
router.put('/:id', requireAuth, requireRole('ADMIN'), validateParams(idParamSchema), validateBody(updateScheduleSchema), (req: Request, res: Response) => {
  const id = Number(req.params.id);
  scheduleService.update(id, req.body, req.user!.id);
  // Sync with running CronManager
  const schedule = scheduleService.getById(id);
  if (schedule.is_active) {
    CronManager.getInstance().addJob(id, schedule.cron_expression, schedule.task_type, schedule.task_config);
  } else {
    CronManager.getInstance().removeJob(id);
  }
  res.json({ success: true, message: '스케줄이 업데이트되었습니다.' });
});

// DELETE /api/schedules/:id — delete a schedule (admin only)
router.delete('/:id', requireAuth, requireRole('ADMIN'), validateParams(idParamSchema), (req: Request, res: Response) => {
  const id = Number(req.params.id);
  scheduleService.delete(id, req.user!.id);
  CronManager.getInstance().removeJob(id);
  res.json({ success: true, message: '스케줄이 삭제되었습니다.' });
});

export default router;
