import type Database from 'better-sqlite3';
import { DatabaseManager } from '../infrastructure/database/connection.js';

export interface ScheduleRow {
  id: number;
  name: string;
  cron_expression: string;
  is_active: number;
  task_type: string;
  task_config: string | null;
  last_run_at: string | null;
  next_run_at: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export class ScheduleRepository {
  private db: Database.Database;

  constructor() {
    this.db = DatabaseManager.getInstance().getDb();
  }

  findAll(): ScheduleRow[] {
    return this.db.prepare('SELECT * FROM schedules ORDER BY created_at DESC').all() as ScheduleRow[];
  }

  findActive(): ScheduleRow[] {
    return this.db.prepare('SELECT * FROM schedules WHERE is_active = 1').all() as ScheduleRow[];
  }

  findById(id: number): ScheduleRow | undefined {
    return this.db.prepare('SELECT * FROM schedules WHERE id = ?').get(id) as ScheduleRow | undefined;
  }

  create(schedule: {
    name: string;
    cronExpression: string;
    taskType: string;
    taskConfig?: string;
    createdBy?: number;
  }): number {
    const result = this.db.prepare(
      'INSERT INTO schedules (name, cron_expression, task_type, task_config, created_by) VALUES (?, ?, ?, ?, ?)'
    ).run(schedule.name, schedule.cronExpression, schedule.taskType, schedule.taskConfig ?? null, schedule.createdBy ?? null);
    return Number(result.lastInsertRowid);
  }

  update(id: number, fields: { name?: string; cronExpression?: string; isActive?: boolean; taskConfig?: string }): void {
    const updates: string[] = [];
    const params: unknown[] = [];

    if (fields.name !== undefined) { updates.push('name = ?'); params.push(fields.name); }
    if (fields.cronExpression !== undefined) { updates.push('cron_expression = ?'); params.push(fields.cronExpression); }
    if (fields.isActive !== undefined) { updates.push('is_active = ?'); params.push(fields.isActive ? 1 : 0); }
    if (fields.taskConfig !== undefined) { updates.push('task_config = ?'); params.push(fields.taskConfig); }

    if (updates.length === 0) return;

    updates.push("updated_at = datetime('now')");
    params.push(id);

    this.db.prepare(`UPDATE schedules SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  updateLastRun(id: number): void {
    this.db.prepare("UPDATE schedules SET last_run_at = datetime('now') WHERE id = ?").run(id);
  }

  delete(id: number): void {
    this.db.prepare('DELETE FROM schedules WHERE id = ?').run(id);
  }

  countActive(): number {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM schedules WHERE is_active = 1').get() as { count: number };
    return row.count;
  }
}
