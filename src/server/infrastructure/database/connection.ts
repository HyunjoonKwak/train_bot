import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export class DatabaseManager {
  private static instance: DatabaseManager | null = null;
  private db: Database.Database;

  private constructor(dbPath: string) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');
    this.db.pragma('foreign_keys = ON');
  }

  static getInstance(dbPath?: string): DatabaseManager {
    if (!DatabaseManager.instance) {
      const p = dbPath ?? process.env.DB_PATH ?? path.resolve('data/trainbot.db');
      DatabaseManager.instance = new DatabaseManager(p);
    }
    return DatabaseManager.instance;
  }

  getDb(): Database.Database { return this.db; }

  close(): void {
    if (!DatabaseManager.instance) return;
    this.db.close();
    DatabaseManager.instance = null;
  }

  static resetInstance(): void {
    if (DatabaseManager.instance) {
      DatabaseManager.instance.db.close();
      DatabaseManager.instance = null;
    }
  }
}
