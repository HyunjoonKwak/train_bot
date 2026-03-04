CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('MANUAL','SCHEDULED','AUTO')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','RUNNING','SUCCESS','FAIL','CANCELLED')),
  departure_station TEXT NOT NULL,
  arrival_station TEXT NOT NULL,
  departure_date TEXT NOT NULL,
  departure_time_from TEXT,
  departure_time_to TEXT,
  train_type TEXT,
  result_count INTEGER DEFAULT 0,
  result_summary TEXT,
  error_message TEXT,
  started_at TEXT,
  finished_at TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_runs_status ON runs(status);
CREATE INDEX idx_runs_created_at ON runs(created_at);
