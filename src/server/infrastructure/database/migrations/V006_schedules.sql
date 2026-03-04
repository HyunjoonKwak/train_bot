CREATE TABLE IF NOT EXISTS schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  cron_expression TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  task_type TEXT NOT NULL CHECK(task_type IN ('SEARCH','CLEANUP','HEALTH_CHECK')),
  task_config TEXT,
  last_run_at TEXT,
  next_run_at TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
