import type Database from 'better-sqlite3';
import { DatabaseManager } from '../infrastructure/database/connection.js';

export interface RunRow {
  id: number;
  type: string;
  status: string;
  departure_station: string;
  arrival_station: string;
  departure_date: string;
  departure_time_from: string | null;
  departure_time_to: string | null;
  train_type: string | null;
  result_count: number;
  result_summary: string | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_by: number | null;
  created_at: string;
}

export class RunRepository {
  private db: Database.Database;

  constructor() {
    this.db = DatabaseManager.getInstance().getDb();
  }

  create(run: {
    type: string;
    departureStation: string;
    arrivalStation: string;
    departureDate: string;
    departureTimeFrom?: string;
    departureTimeTo?: string;
    trainType?: string;
    createdBy?: number;
  }): number {
    const result = this.db.prepare(`
      INSERT INTO runs (type, departure_station, arrival_station, departure_date, departure_time_from, departure_time_to, train_type, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      run.type,
      run.departureStation,
      run.arrivalStation,
      run.departureDate,
      run.departureTimeFrom ?? null,
      run.departureTimeTo ?? null,
      run.trainType ?? null,
      run.createdBy ?? null,
    );
    return Number(result.lastInsertRowid);
  }

  findById(id: number): RunRow | undefined {
    return this.db.prepare('SELECT * FROM runs WHERE id = ?').get(id) as RunRow | undefined;
  }

  findAll(options: { page: number; limit: number; status?: string }): { rows: RunRow[]; total: number } {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (options.status) {
      conditions.push('status = ?');
      params.push(options.status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const total = (this.db.prepare(`SELECT COUNT(*) as count FROM runs ${where}`).get(...params) as { count: number }).count;

    const offset = (options.page - 1) * options.limit;
    const rows = this.db.prepare(
      `SELECT * FROM runs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, options.limit, offset) as RunRow[];

    return { rows, total };
  }

  findRecent(limit: number = 10): RunRow[] {
    return this.db.prepare('SELECT * FROM runs ORDER BY created_at DESC LIMIT ?').all(limit) as RunRow[];
  }

  findTodayRuns(): RunRow[] {
    return this.db.prepare(
      "SELECT * FROM runs WHERE date(created_at) = date('now') ORDER BY created_at DESC"
    ).all() as RunRow[];
  }

  countTodayByStatus(): { total: number; success: number; fail: number } {
    const row = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END), 0) as success,
        COALESCE(SUM(CASE WHEN status = 'FAIL' THEN 1 ELSE 0 END), 0) as fail
      FROM runs WHERE date(created_at) = date('now')
    `).get() as { total: number; success: number; fail: number };
    return row;
  }

  updateStatus(id: number, status: string, extra?: { resultCount?: number; resultSummary?: string; errorMessage?: string }): void {
    if (status === 'RUNNING') {
      this.db.prepare("UPDATE runs SET status = ?, started_at = datetime('now') WHERE id = ?").run(status, id);
    } else {
      this.db.prepare(
        "UPDATE runs SET status = ?, finished_at = datetime('now'), result_count = ?, result_summary = ?, error_message = ? WHERE id = ?"
      ).run(
        status,
        extra?.resultCount ?? 0,
        extra?.resultSummary ?? null,
        extra?.errorMessage ?? null,
        id,
      );
    }
  }

  deleteOlderThan(days: number): number {
    if (days < 1) throw new Error('days must be >= 1');
    const result = this.db.prepare(
      "DELETE FROM runs WHERE created_at < datetime('now', ?)"
    ).run(`-${days} days`);
    return result.changes;
  }
}
