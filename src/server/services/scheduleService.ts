import { ScheduleRepository } from '../repositories/scheduleRepository.js';
import { AuditService } from './auditService.js';
import { AppError } from '../middleware/errorHandler.js';

export class ScheduleService {
  private repo: ScheduleRepository;
  private audit: AuditService;

  constructor() {
    this.repo = new ScheduleRepository();
    this.audit = new AuditService();
  }

  getAll() {
    return this.repo.findAll();
  }

  getActive() {
    return this.repo.findActive();
  }

  getById(id: number) {
    const schedule = this.repo.findById(id);
    if (!schedule) throw new AppError(404, '스케줄을 찾을 수 없습니다.');
    return schedule;
  }

  create(data: { name: string; cronExpression: string; taskType: string; taskConfig?: Record<string, unknown>; createdBy?: number }) {
    const id = this.repo.create({
      name: data.name,
      cronExpression: data.cronExpression,
      taskType: data.taskType,
      taskConfig: data.taskConfig ? JSON.stringify(data.taskConfig) : undefined,
      createdBy: data.createdBy,
    });
    this.audit.log({
      userId: data.createdBy,
      action: 'SCHEDULE_CREATE',
      entityType: 'schedule',
      entityId: String(id),
      detail: `${data.name} (${data.cronExpression})`,
    });
    return id;
  }

  update(id: number, fields: { name?: string; cronExpression?: string; isActive?: boolean; taskConfig?: Record<string, unknown> }, userId?: number) {
    this.getById(id); // throws if not found
    this.repo.update(id, {
      name: fields.name,
      cronExpression: fields.cronExpression,
      isActive: fields.isActive,
      taskConfig: fields.taskConfig ? JSON.stringify(fields.taskConfig) : undefined,
    });
    this.audit.log({
      userId,
      action: 'SCHEDULE_UPDATE',
      entityType: 'schedule',
      entityId: String(id),
    });
  }

  delete(id: number, userId?: number) {
    this.getById(id);
    this.repo.delete(id);
    this.audit.log({
      userId,
      action: 'SCHEDULE_DELETE',
      entityType: 'schedule',
      entityId: String(id),
    });
  }

  markRun(id: number) {
    this.repo.updateLastRun(id);
  }

  countActive() {
    return this.repo.countActive();
  }
}
