import { DatabaseManager } from '../infrastructure/database/connection.js';
import type Database from 'better-sqlite3';

export function getTestDb(): Database.Database {
  return DatabaseManager.getInstance().getDb();
}

export function seedConfig(entries: Array<{ key: string; value: string; description?: string }>): void {
  const db = getTestDb();
  const stmt = db.prepare(
    'INSERT OR REPLACE INTO config (key, value, description) VALUES (?, ?, ?)',
  );
  for (const e of entries) {
    stmt.run(e.key, e.value, e.description ?? null);
  }
}

export function createTestUser(overrides?: Partial<{
  kakao_id: string;
  nickname: string;
  role: string;
}>): number {
  const db = getTestDb();
  const result = db.prepare(
    'INSERT INTO users (kakao_id, nickname, role) VALUES (?, ?, ?)',
  ).run(
    overrides?.kakao_id ?? 'test_kakao_123',
    overrides?.nickname ?? 'TestUser',
    overrides?.role ?? 'ADMIN',
  );
  return Number(result.lastInsertRowid);
}
