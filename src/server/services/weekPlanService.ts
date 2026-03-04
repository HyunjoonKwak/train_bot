import { WeekPlanRepository } from '../repositories/weekPlanRepository.js';
import { AuditService } from './auditService.js';
import { AppError } from '../middleware/errorHandler.js';

export class WeekPlanService {
  private repo: WeekPlanRepository;
  private audit: AuditService;

  constructor() {
    this.repo = new WeekPlanRepository();
    this.audit = new AuditService();
  }

  getWeekPlans(userId: number, startDate: string, endDate: string) {
    return this.repo.findByUserAndDateRange(userId, startDate, endDate);
  }

  getUpcoming(userId: number, limit?: number) {
    return this.repo.findUpcoming(userId, limit);
  }

  countUpcoming(userId: number) {
    return this.repo.countUpcoming(userId);
  }

  updatePlan(userId: number, planDate: string, direction: string, status: string, preferredTime?: string, trainInfo?: string) {
    this.repo.upsert({
      userId,
      planDate,
      direction,
      status,
      preferredTime,
      trainInfo,
    });
    this.audit.log({
      userId,
      action: 'WEEK_PLAN_UPDATE',
      entityType: 'week_plan',
      detail: `${planDate} ${direction} -> ${status}`,
    });
  }

  bulkUpdate(userId: number, plans: Array<{ planDate: string; direction: string; status: string; preferredTime?: string }>) {
    const items = plans.map(p => ({
      userId,
      planDate: p.planDate,
      direction: p.direction,
      status: p.status,
      preferredTime: p.preferredTime,
    }));
    this.repo.bulkUpsert(items);
    this.audit.log({
      userId,
      action: 'WEEK_PLAN_BULK_UPDATE',
      entityType: 'week_plan',
      detail: `${plans.length} plans updated`,
    });
  }

  findNeedingSearch() {
    return this.repo.findByStatus('NEEDED');
  }

  updateWithRecommendation(id: number, recommendation: string) {
    this.repo.updateStatus(id, 'RECOMMENDED', { recommendation });
  }
}
