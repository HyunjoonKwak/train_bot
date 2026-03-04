import type Database from 'better-sqlite3';
import { DatabaseManager } from '../infrastructure/database/connection.js';

export interface UserRow {
  id: number;
  kakao_id: string;
  nickname: string;
  profile_image: string | null;
  role: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export class UserRepository {
  private db: Database.Database;

  constructor() {
    this.db = DatabaseManager.getInstance().getDb();
  }

  findByKakaoId(kakaoId: string): UserRow | undefined {
    return this.db.prepare('SELECT * FROM users WHERE kakao_id = ?').get(kakaoId) as UserRow | undefined;
  }

  findById(id: number): UserRow | undefined {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  }

  findAll(): UserRow[] {
    return this.db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as UserRow[];
  }

  findActive(): UserRow[] {
    return this.db.prepare('SELECT * FROM users WHERE is_active = 1 ORDER BY created_at DESC').all() as UserRow[];
  }

  countActive(): number {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get() as { count: number };
    return row.count;
  }

  upsertByKakaoId(kakaoId: string, nickname: string, profileImage: string | null): UserRow {
    this.db.prepare(`
      INSERT INTO users (kakao_id, nickname, profile_image)
      VALUES (?, ?, ?)
      ON CONFLICT(kakao_id) DO UPDATE SET
        nickname = excluded.nickname,
        profile_image = excluded.profile_image,
        updated_at = datetime('now')
    `).run(kakaoId, nickname, profileImage);
    return this.findByKakaoId(kakaoId)!;
  }

  updateRole(id: number, role: string): void {
    this.db.prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?").run(role, id);
  }

  updateActive(id: number, isActive: boolean): void {
    this.db.prepare("UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?").run(isActive ? 1 : 0, id);
  }
}
