CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kakao_id TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  profile_image TEXT,
  role TEXT NOT NULL DEFAULT 'MEMBER' CHECK(role IN ('ADMIN','MEMBER')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_kakao_id ON users(kakao_id);
