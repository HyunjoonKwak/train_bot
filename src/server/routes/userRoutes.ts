import { Router } from 'express';
import type { Request, Response } from 'express';
import { UserService } from '../services/userService.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { updateUserRoleSchema, idParamSchema } from '../schemas/index.js';

export function createUserRoutes(): Router {
  const router = Router();
  const userService = new UserService();

  // GET /api/users — list all users (admin only)
  router.get('/', requireAuth, requireRole('ADMIN'), (_req: Request, res: Response) => {
    const users = userService.getAll();
    res.json({ success: true, data: users });
  });

  // PATCH /api/users/:id/role — update user role (admin only)
  router.patch('/:id/role', requireAuth, requireRole('ADMIN'), validateParams(idParamSchema), validateBody(updateUserRoleSchema), (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (id === req.user!.id) {
      res.status(400).json({ success: false, error: '자신의 역할은 변경할 수 없습니다.' });
      return;
    }
    userService.updateRole(id, req.body.role, req.user!.id);
    res.json({ success: true, message: '역할이 변경되었습니다.' });
  });

  // PATCH /api/users/:id/deactivate — deactivate user (admin only)
  router.patch('/:id/deactivate', requireAuth, requireRole('ADMIN'), validateParams(idParamSchema), (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (id === req.user!.id) {
      res.status(400).json({ success: false, error: '자신을 비활성화할 수 없습니다.' });
      return;
    }
    userService.deactivate(id, req.user!.id);
    res.json({ success: true, message: '사용자가 비활성화되었습니다.' });
  });

  // PATCH /api/users/:id/activate — activate user (admin only)
  router.patch('/:id/activate', requireAuth, requireRole('ADMIN'), validateParams(idParamSchema), (req: Request, res: Response) => {
    const id = Number(req.params.id);
    userService.activate(id, req.user!.id);
    res.json({ success: true, message: '사용자가 활성화되었습니다.' });
  });

  return router;
}
