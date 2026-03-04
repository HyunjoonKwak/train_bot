import type Database from 'better-sqlite3';
import { DatabaseManager } from '../infrastructure/database/connection.js';

export interface WeekPlanRow {
  id: number;
  user_id: number;
  plan_date: string;
  direction: string;
  status: string;
  preferred_time: string | null;
  train_info: string | null;
  recommendation: string | null;
  updated_at: string;
  created_at: string;
}

export class WeekPlanRepository {
  private db: Database.Database;

  constructor() {
    this.db = DatabaseManager.getInstance().getDb();
  }

  findByUserAndDateRange(userId: number, startDate: string, endDate: string): WeekPlanRow[] {
    return this.db.prepare(
      'SELECT * FROM week_plans WHERE user_id = ? AND plan_date >= ? AND plan_date <= ? ORDER BY plan_date, direction'
    ).all(userId, startDate, endDate) as WeekPlanRow[];
  }

  findByUserAndDate(userId: number, planDate: string, direction: string): WeekPlanRow | undefined {
    return this.db.prepare(
      'SELECT * FROM week_plans WHERE user_id = ? AND plan_date = ? AND direction = ?'
    ).get(userId, planDate, direction) as WeekPlanRow | undefined;
  }

  findByStatus(status: string): WeekPlanRow[] {
    return this.db.prepare('SELECT * FROM week_plans WHERE status = ? ORDER BY plan_date').all(status) as WeekPlanRow[];
  }

  findUpcoming(userId: number, limit: number = 7): WeekPlanRow[] {
    return this.db.prepare(
      "SELECT * FROM week_plans WHERE user_id = ? AND plan_date >= date('now') AND status IN ('NEEDED', 'SEARCHING') ORDER BY plan_date LIMIT ?"
    ).all(userId, limit) as WeekPlanRow[];
  }

  upsert(plan: {
    userId: number;
    planDate: string;
    direction: string;
    status: string;
    preferredTime?: string;
    trainInfo?: string;
    recommendation?: string;
  }): void {
    this.db.prepare(`
      INSERT INTO week_plans (user_id, plan_date, direction, status, preferred_time, train_info, recommendation)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, plan_date, direction) DO UPDATE SET
        status = excluded.status,
        preferred_time = COALESCE(excluded.preferred_time, preferred_time),
        train_info = COALESCE(excluded.train_info, train_info),
        recommendation = COALESCE(excluded.recommendation, recommendation),
        updated_at = datetime('now')
    `).run(
      plan.userId,
      plan.planDate,
      plan.direction,
      plan.status,
      plan.preferredTime ?? null,
      plan.trainInfo ?? null,
      plan.recommendation ?? null,
    );
  }

  updateStatus(id: number, status: string, extra?: { trainInfo?: string; recommendation?: string }): void {
    this.db.prepare(
      'UPDATE week_plans SET status = ?, train_info = COALESCE(?, train_info), recommendation = COALESCE(?, recommendation), updated_at = datetime(\'now\') WHERE id = ?'
    ).run(status, extra?.trainInfo ?? null, extra?.recommendation ?? null, id);
  }

  bulkUpsert(plans: Array<{
    userId: number;
    planDate: string;
    direction: string;
    status: string;
    preferredTime?: string;
  }>): void {
    const upsertMany = this.db.transaction((items: typeof plans) => {
      for (const plan of items) {
        this.upsert(plan);
      }
    });
    upsertMany(plans);
  }

  countUpcoming(userId: number): number {
    const row = this.db.prepare(
      "SELECT COUNT(*) as count FROM week_plans WHERE user_id = ? AND plan_date >= date('now') AND status IN ('NEEDED', 'SEARCHING')"
    ).get(userId) as { count: number };
    return row.count;
  }
}
