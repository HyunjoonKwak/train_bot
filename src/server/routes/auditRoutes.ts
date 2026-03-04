import { Router } from 'express';
import type { Request, Response } from 'express';
import { AuditService } from '../services/auditService.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { paginationSchema } from '../schemas/index.js';
import { toCamelArray } from '../utils/index.js';

export function createAuditRoutes(): Router {
  const router = Router();
  const auditService = new AuditService();

  // GET /api/audit-logs — list audit logs (admin only)
  router.get('/', requireAuth, requireRole('ADMIN'), validateQuery(paginationSchema), (req: Request, res: Response) => {
    const { page, limit } = req.validatedQuery;
    const action = req.query.action as string | undefined;
    const userId = req.query.userId ? Number(req.query.userId) : undefined;

    const { rows, total } = auditService.getAll({ page, limit, action, userId });
    res.json({
      success: true,
      data: toCamelArray(rows),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  return router;
}
