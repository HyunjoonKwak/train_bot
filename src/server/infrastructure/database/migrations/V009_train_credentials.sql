-- Train API credentials stored in config table
INSERT OR IGNORE INTO config (key, value, description) VALUES
  ('srt_login_type', 'phone', 'SRT 로그인 방식 (phone 또는 member)'),
  ('srt_login_id', '', 'SRT 로그인 ID (전화번호 또는 회원번호)'),
  ('srt_password', '', 'SRT 로그인 비밀번호'),
  ('korail_login_type', 'phone', 'Korail 로그인 방식 (phone 또는 member)'),
  ('korail_login_id', '', 'Korail 로그인 ID (전화번호 또는 회원번호)'),
  ('korail_password', '', 'Korail 로그인 비밀번호');
