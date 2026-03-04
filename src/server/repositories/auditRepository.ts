import type Database from 'better-sqlite3';
import { DatabaseManager } from '../infrastructure/database/connection.js';

export interface AuditRow {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  detail: string | null;
  ip_address: string | null;
  created_at: string;
}

export class AuditRepository {
  private db: Database.Database;

  constructor() {
    this.db = DatabaseManager.getInstance().getDb();
  }

  create(entry: {
    userId?: number | null;
    action: string;
    entityType?: string;
    entityId?: string;
    detail?: string;
    ipAddress?: string;
  }): void {
    this.db.prepare(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      entry.userId ?? null,
      entry.action,
      entry.entityType ?? null,
      entry.entityId ?? null,
      entry.detail ?? null,
      entry.ipAddress ?? null,
    );
  }

  findAll(options: { page: number; limit: number; action?: string; userId?: number }): { rows: AuditRow[]; total: number } {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (options.action !== undefined && options.action !== '') {
      conditions.push('action = ?');
      params.push(options.action);
    }
    if (options.userId !== undefined) {
      conditions.push('user_id = ?');
      params.push(options.userId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const total = (this.db.prepare(`SELECT COUNT(*) as count FROM audit_logs ${where}`).get(...params) as { count: number }).count;

    const offset = (options.page - 1) * options.limit;
    const rows = this.db.prepare(
      `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, options.limit, offset) as AuditRow[];

    return { rows, total };
  }

  deleteOlderThan(days: number): number {
    if (days < 1) throw new Error('days must be >= 1');
    const result = this.db.prepare(
      "DELETE FROM audit_logs WHERE created_at < datetime('now', ?)"
    ).run(`-${days} days`);
    return result.changes;
  }
}
