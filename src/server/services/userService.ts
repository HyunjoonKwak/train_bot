import { UserRepository } from '../repositories/userRepository.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuditService } from './auditService.js';
import type { UserRole } from '../types/index.js';

const MAX_ACTIVE_USERS = 4;

export class UserService {
  private repo: UserRepository;
  private audit: AuditService;

  constructor() {
    this.repo = new UserRepository();
    this.audit = new AuditService();
  }

  findOrCreateByKakao(kakaoId: string, nickname: string, profileImage: string | null) {
    const existing = this.repo.findByKakaoId(kakaoId);

    if (!existing) {
      const activeCount = this.repo.countActive();
      if (activeCount >= MAX_ACTIVE_USERS) {
        throw new AppError(403, `최대 활성 사용자 수(${MAX_ACTIVE_USERS}명)를 초과했습니다.`);
      }
    }

    const user = this.repo.upsertByKakaoId(kakaoId, nickname, profileImage);

    this.audit.log({
      userId: user.id,
      action: existing ? 'USER_LOGIN' : 'USER_REGISTER',
      entityType: 'user',
      entityId: String(user.id),
    });

    return user;
  }

  getAll() {
    return this.repo.findAll();
  }

  getById(id: number) {
    return this.repo.findById(id);
  }

  updateRole(id: number, role: UserRole, updatedBy: number) {
    const user = this.repo.findById(id);
    if (!user) throw new AppError(404, '사용자를 찾을 수 없습니다.');
    this.repo.updateRole(id, role);
    this.audit.log({
      userId: updatedBy,
      action: 'USER_ROLE_CHANGE',
      entityType: 'user',
      entityId: String(id),
      detail: `역할 변경: ${role}`,
    });
  }

  deactivate(id: number, updatedBy: number) {
    const user = this.repo.findById(id);
    if (!user) throw new AppError(404, '사용자를 찾을 수 없습니다.');
    this.repo.updateActive(id, false);
    this.audit.log({
      userId: updatedBy,
      action: 'USER_DEACTIVATE',
      entityType: 'user',
      entityId: String(id),
    });
  }

  activate(id: number, updatedBy: number) {
    const user = this.repo.findById(id);
    if (!user) throw new AppError(404, '사용자를 찾을 수 없습니다.');
    if (user.is_active) return; // already active, no-op
    const activeCount = this.repo.countActive();
    if (activeCount >= MAX_ACTIVE_USERS) {
      throw new AppError(400, `최대 활성 사용자 수(${MAX_ACTIVE_USERS}명)를 초과합니다.`);
    }
    this.repo.updateActive(id, true);
    this.audit.log({
      userId: updatedBy,
      action: 'USER_ACTIVATE',
      entityType: 'user',
      entityId: String(id),
    });
  }
}
