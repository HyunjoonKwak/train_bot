CREATE TABLE IF NOT EXISTS config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  updated_by INTEGER REFERENCES users(id),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Default config values
INSERT OR IGNORE INTO config (key, value, description) VALUES
  ('departure_station', '김천(구미)', '출발역'),
  ('arrival_station', '동탄', '도착역'),
  ('preferred_train_type', 'SRT', '선호 열차 종류'),
  ('max_results', '10', '최대 조회 결과 수'),
  ('auto_reserve', '0', '자동 예매 활성화 (0/1)'),
  ('telegram_enabled', '1', '텔레그램 알림 활성화'),
  ('search_interval_minutes', '5', '자동 검색 간격(분)');
