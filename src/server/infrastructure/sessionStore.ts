import session from 'express-session';
import type Database from 'better-sqlite3';
import { DatabaseManager } from './database/connection.js';
import { logger } from '../utils/logger.js';

export class SQLiteSessionStore extends session.Store {
  private db: Database.Database;
  private stmtGet: Database.Statement;
  private stmtSet: Database.Statement;
  private stmtDestroy: Database.Statement;
  private stmtTouch: Database.Statement;
  private stmtClearExpired: Database.Statement;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super();
    this.db = DatabaseManager.getInstance().getDb();
    this.stmtGet = this.db.prepare("SELECT sess FROM sessions WHERE sid = ? AND expired_at > datetime('now')");
    this.stmtSet = this.db.prepare(`
      INSERT INTO sessions (sid, sess, expired_at)
      VALUES (?, ?, ?)
      ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expired_at = excluded.expired_at
    `);
    this.stmtDestroy = this.db.prepare('DELETE FROM sessions WHERE sid = ?');
    this.stmtTouch = this.db.prepare('UPDATE sessions SET expired_at = ? WHERE sid = ?');
    this.stmtClearExpired = this.db.prepare("DELETE FROM sessions WHERE expired_at <= datetime('now')");

    // Clear expired sessions every 15 minutes
    this.cleanupTimer = setInterval(() => {
      try {
        this.clearExpired();
      } catch (err) {
        logger.error('Session cleanup error', { error: err });
      }
    }, 15 * 60 * 1000);
    // Don't prevent process from exiting
    this.cleanupTimer.unref();
  }

  get(sid: string, callback: (err?: Error | null, session?: any) => void): void {
    try {
      const row = this.stmtGet.get(sid) as { sess: string } | undefined;
      callback(null, row ? JSON.parse(row.sess) : null);
    } catch (err) {
      callback(err as Error);
    }
  }

  set(sid: string, session: any, callback?: (err?: Error) => void): void {
    try {
      const maxAge = session.cookie?.maxAge ?? 86400000;
      const expiredAt = new Date(Date.now() + maxAge).toISOString();
      const sess = JSON.stringify(session);
      this.stmtSet.run(sid, sess, expiredAt);
      callback?.();
    } catch (err) {
      callback?.(err as Error);
    }
  }

  destroy(sid: string, callback?: (err?: Error) => void): void {
    try {
      this.stmtDestroy.run(sid);
      callback?.();
    } catch (err) {
      callback?.(err as Error);
    }
  }

  touch(sid: string, session: any, callback?: (err?: Error) => void): void {
    try {
      const maxAge = session.cookie?.maxAge ?? 86400000;
      const expiredAt = new Date(Date.now() + maxAge).toISOString();
      this.stmtTouch.run(expiredAt, sid);
      callback?.();
    } catch (err) {
      callback?.(err as Error);
    }
  }

  clearExpired(): void {
    this.stmtClearExpired.run();
  }

  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}
