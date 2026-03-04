import { describe, it, expect, beforeEach } from 'vitest';
import { WeekPlanService } from '../../services/weekPlanService.js';
import { createTestUser } from '../helpers.js';

describe('WeekPlanService', () => {
  let service: WeekPlanService;
  let userId: number;

  beforeEach(() => {
    service = new WeekPlanService();
    userId = createTestUser();
  });

  it('returns empty plans for a new user', () => {
    const plans = service.getWeekPlans(userId, '2026-03-01', '2026-03-07');
    expect(plans).toEqual([]);
  });

  it('creates and retrieves a plan via updatePlan', () => {
    service.updatePlan(userId, '2026-03-04', 'TO_WORK', 'NEEDED', '07:00');

    const plans = service.getWeekPlans(userId, '2026-03-01', '2026-03-07');
    expect(plans).toHaveLength(1);
    expect(plans[0].plan_date).toBe('2026-03-04');
    expect(plans[0].direction).toBe('TO_WORK');
    expect(plans[0].status).toBe('NEEDED');
    expect(plans[0].preferred_time).toBe('07:00');
  });

  it('upserts existing plan on duplicate key', () => {
    service.updatePlan(userId, '2026-03-04', 'TO_WORK', 'NEEDED');
    service.updatePlan(userId, '2026-03-04', 'TO_WORK', 'BOOKED', '08:00');

    const plans = service.getWeekPlans(userId, '2026-03-04', '2026-03-04');
    expect(plans).toHaveLength(1);
    expect(plans[0].status).toBe('BOOKED');
    expect(plans[0].preferred_time).toBe('08:00');
  });

  it('bulk updates multiple plans', () => {
    service.bulkUpdate(userId, [
      { planDate: '2026-03-04', direction: 'TO_WORK', status: 'NEEDED' },
      { planDate: '2026-03-04', direction: 'TO_HOME', status: 'NEEDED', preferredTime: '18:00' },
      { planDate: '2026-03-05', direction: 'TO_WORK', status: 'NOT_NEEDED' },
    ]);

    const plans = service.getWeekPlans(userId, '2026-03-04', '2026-03-05');
    expect(plans).toHaveLength(3);
  });

  it('findNeedingSearch returns plans with NEEDED status', () => {
    service.updatePlan(userId, '2026-03-04', 'TO_WORK', 'NEEDED');
    service.updatePlan(userId, '2026-03-04', 'TO_HOME', 'BOOKED');
    service.updatePlan(userId, '2026-03-05', 'TO_WORK', 'NEEDED');

    const needed = service.findNeedingSearch();
    expect(needed).toHaveLength(2);
    expect(needed.every((p: any) => p.status === 'NEEDED')).toBe(true);
  });
});
