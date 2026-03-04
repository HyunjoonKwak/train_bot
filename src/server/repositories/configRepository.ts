import type Database from 'better-sqlite3';
import { DatabaseManager } from '../infrastructure/database/connection.js';

export interface ConfigRow {
  id: number;
  key: string;
  value: string;
  description: string | null;
  updated_by: number | null;
  updated_at: string;
}

export class ConfigRepository {
  private db: Database.Database;

  constructor() {
    this.db = DatabaseManager.getInstance().getDb();
  }

  findAll(): ConfigRow[] {
    return this.db.prepare('SELECT * FROM config ORDER BY key').all() as ConfigRow[];
  }

  findByKey(key: string): ConfigRow | undefined {
    return this.db.prepare('SELECT * FROM config WHERE key = ?').get(key) as ConfigRow | undefined;
  }

  getValue(key: string, defaultValue?: string): string {
    const row = this.findByKey(key);
    return row?.value ?? defaultValue ?? '';
  }

  updateValue(key: string, value: string, updatedBy?: number): void {
    this.db.prepare(
      'UPDATE config SET value = ?, updated_by = ?, updated_at = datetime(\'now\') WHERE key = ?'
    ).run(value, updatedBy ?? null, key);
  }

  upsert(key: string, value: string, description?: string, updatedBy?: number): void {
    this.db.prepare(`
      INSERT INTO config (key, value, description, updated_by)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, description = COALESCE(excluded.description, description), updated_by = excluded.updated_by, updated_at = datetime('now')
    `).run(key, value, description ?? null, updatedBy ?? null);
  }
}
