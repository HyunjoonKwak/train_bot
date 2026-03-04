CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY,
  sess TEXT NOT NULL,
  expired_at TEXT NOT NULL
);

CREATE INDEX idx_sessions_expired ON sessions(expired_at);
