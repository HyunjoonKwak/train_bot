CREATE TABLE IF NOT EXISTS dedupe (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_hash TEXT NOT NULL UNIQUE,
  sent_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_dedupe_hash ON dedupe(message_hash);
CREATE INDEX idx_dedupe_sent_at ON dedupe(sent_at);
