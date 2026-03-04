CREATE TABLE IF NOT EXISTS week_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  plan_date TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('TO_WORK','TO_HOME')),
  status TEXT NOT NULL DEFAULT 'NEEDED' CHECK(status IN ('NEEDED','BOOKED','NOT_NEEDED','SEARCHING','RECOMMENDED')),
  preferred_time TEXT,
  train_info TEXT,
  recommendation TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, plan_date, direction)
);

CREATE INDEX idx_week_plans_user_date ON week_plans(user_id, plan_date);
CREATE INDEX idx_week_plans_status ON week_plans(status);
