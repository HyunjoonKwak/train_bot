import type Database from 'better-sqlite3';
import { DatabaseManager } from '../infrastructure/database/connection.js';

export class DedupeRepository {
  private db: Database.Database;

  constructor() {
    this.db = DatabaseManager.getInstance().getDb();
  }

  exists(hash: string): boolean {
    const row = this.db.prepare('SELECT 1 FROM dedupe WHERE message_hash = ?').get(hash);
    return !!row;
  }

  insert(hash: string): void {
    this.db.prepare('INSERT OR IGNORE INTO dedupe (message_hash) VALUES (?)').run(hash);
  }

  cleanup(retentionDays: number = 7): number {
    if (retentionDays < 1) throw new Error('retentionDays must be >= 1');
    const result = this.db.prepare(
      "DELETE FROM dedupe WHERE sent_at < datetime('now', ?)"
    ).run(`-${retentionDays} days`);
    return result.changes;
  }
}
