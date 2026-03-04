# 운영 가이드 (Operations Guide)

| 항목 | 내용 |
|------|------|
| **프로젝트명** | TrainBot — 김천구미↔동탄 주간 예매 어시스턴트 |
| **문서 버전** | v1.0 |
| **작성일** | 2026-03-02 |
| **작성자** | 프로젝트 오너 |
| **대상 독자** | 프로젝트 오너 (운영자), 시스템 관리자 |

---

## 1. 시스템 개요

### 1.1 시스템 구성도

```
[사용자 브라우저] ──(HTTP 8080)──> [Synology NAS]
                                        │
                                  [Docker Container: trainbot]
                                        │
                                  ┌─────┴─────┐
                                  │  Express   │
                                  │ (포트 3000) │
                                  ├────────────┤
                                  │ React SPA  │ ← Vite 빌드 정적 파일
                                  │ (dist/)    │
                                  ├────────────┤
                                  │ node-cron  │ ← 스케줄 실행
                                  └──┬───┬───┬─┘
                                     │   │   │
                              ┌──────┘   │   └──────┐
                              ▼          ▼          ▼
                         [SQLite DB]  [외부 API]  [Telegram]
                         /data/       SRT/KTX     Bot API
                         trainbot.db  열차 조회    알림 발송
```

### 1.2 주요 컴포넌트

| 컴포넌트 | 설명 | 기술 | 비고 |
|----------|------|------|------|
| 프론트엔드 | 사용자 웹 인터페이스 (11개 화면) | React 18, Vite, Tailwind CSS, Zustand | Express에서 정적 파일 서빙 |
| API 서버 | 백엔드 비즈니스 로직 (24개 API) | Node.js 20, Express, TypeScript | 단일 프로세스 |
| 데이터베이스 | 데이터 저장소 (8개 테이블) | SQLite 3 (better-sqlite3, WAL) | 파일 기반 |
| 스케줄러 | cron 기반 자동 검색 실행 | node-cron | 인메모리 스케줄 |
| 외부 열차 API | SRT/KTX 열차 시간표 조회 | HTTP REST 호출 | 외부 의존성 |
| 텔레그램 Bot | 추천 결과 알림 발송 | Telegram Bot API | 외부 의존성 |

### 1.3 기술 스택 요약

| 계층 | 기술 | 버전 |
|------|------|------|
| Frontend | React + Vite + Tailwind CSS | 18.x / 5.x / 3.x |
| Backend | Node.js + Express + TypeScript | 20 LTS / 4.x / 5.x |
| Database | SQLite (better-sqlite3) | 3.x |
| Auth | passport-kakao + express-session | - |
| Scheduler | node-cron | 3.x |
| Validation | zod | 3.x |
| Logging | winston | 3.x |
| Container | Docker (node:20-alpine) | 20.x+ |

---

## 2. 접속 정보

### 2.1 서비스 URL

| 환경 | URL | 용도 | 비고 |
|------|-----|------|------|
| 운영 (NAS) | `http://192.168.x.x:8080` | TrainBot 웹 UI | NAS 내부 IP |
| 운영 (NAS) | `http://192.168.x.x:8080/health` | 헬스체크 | JSON 상태 반환 |
| 운영 (NAS) | `http://192.168.x.x:8080/api/version` | 버전 확인 | 배포 버전 |

### 2.2 NAS 접속

| 접속 방법 | 정보 | 비고 |
|-----------|------|------|
| SSH | `ssh admin@192.168.x.x` | 포트 22 (또는 NAS 설정 포트) |
| DSM 웹 | `http://192.168.x.x:5000` | NAS 관리 콘솔 |
| Docker 관리 | DSM > Docker 패키지 | 컨테이너 상태 GUI 확인 |

### 2.3 데이터 파일 위치

| 파일 | 경로 (NAS) | 경로 (컨테이너) | 용도 |
|------|-----------|----------------|------|
| SQLite DB | `/volume1/docker/trainbot/data/trainbot.db` | `/data/trainbot.db` | 주 데이터베이스 |
| WAL 파일 | `.../data/trainbot.db-wal` | `/data/trainbot.db-wal` | Write-Ahead Log |
| 애플리케이션 로그 | `.../data/logs/app-YYYY-MM-DD.log` | `/data/logs/app-*.log` | 일별 로그 |
| 에러 로그 | `.../data/logs/error-YYYY-MM-DD.log` | `/data/logs/error-*.log` | 에러 전용 |
| 자격증명 | `.../data/.env.credentials` | `/data/.env.credentials` | 결제 민감정보 (권한 600) |
| 환경변수 | `/volume1/docker/trainbot/.env` | (env_file) | 시스템 환경변수 |
| 백업 | `.../data/backup/trainbot-YYYYMMDD.db` | - | 일일 DB 백업 |

> **주의**: `.env` 파일과 `.env.credentials` 파일에는 민감 정보가 포함되어 있습니다. 접근 권한을 최소화하세요.

---

## 3. 일상 운영

### 3.1 컨테이너 관리 명령어

```bash
# 프로젝트 디렉토리 이동
cd /volume1/docker/trainbot

# 컨테이너 상태 확인
docker-compose ps

# 컨테이너 로그 확인 (최근 100줄)
docker-compose logs --tail=100

# 실시간 로그 모니터링
docker-compose logs -f

# 컨테이너 재시작
docker-compose restart

# 컨테이너 중지
docker-compose down

# 컨테이너 시작
docker-compose up -d

# 컨테이너 재빌드 + 재시작 (코드 업데이트 후)
docker-compose up -d --build

# 컨테이너 내부 접속 (디버깅)
docker exec -it trainbot sh

# 헬스체크
curl -s http://localhost:8080/health | jq .
```

### 3.2 일일 점검 체크리스트

| # | 점검 항목 | 확인 방법 | 정상 기준 |
|---|----------|-----------|-----------|
| 1 | 컨테이너 상태 | `docker-compose ps` | Status: Up (healthy) |
| 2 | 헬스체크 | `curl -s http://localhost:8080/health` | `{"status":"ok"}` |
| 3 | 에러 로그 확인 | `tail -20 data/logs/error-$(date +%Y-%m-%d).log` | 비정상 에러 없음 |
| 4 | 스케줄 실행 확인 | 텔레그램 알림 수신 여부 또는 UI > Logs 페이지 | 예정된 스케줄 정상 실행 |
| 5 | 디스크 사용률 | `df -h /volume1` | < 80% |
| 6 | DB 백업 확인 | `ls -la data/backup/ \| tail -3` | 오늘 날짜 백업 파일 존재 |

### 3.3 주간 점검 체크리스트

| # | 점검 항목 | 확인 방법 | 비고 |
|---|----------|-----------|------|
| 1 | DB 크기 확인 | `ls -lh data/trainbot.db` | 연간 ~100MB 예상, 비정상 증가 여부 |
| 2 | 로그 파일 정리 | 30일 초과 로그 삭제 확인 | 자동 삭제 스크립트 동작 확인 |
| 3 | 오래된 백업 정리 | 30일 초과 백업 삭제 확인 | 자동 삭제 스크립트 동작 확인 |
| 4 | 텔레그램 Bot 상태 | 최근 발송 성공 여부 | Logs 페이지에서 확인 |
| 5 | NAS 시스템 상태 | DSM > 리소스 모니터 | CPU/메모리/디스크 정상 |

### 3.4 월간 점검 체크리스트

| # | 점검 항목 | 확인 방법 | 비고 |
|---|----------|-----------|------|
| 1 | DB 백업 복원 테스트 | 백업 파일을 테스트 경로에 복원 후 확인 | 데이터 정합성 검증 |
| 2 | Docker 이미지 업데이트 | `docker-compose pull` (기반 이미지) | Node.js 보안 패치 |
| 3 | npm audit | 컨테이너 내부에서 `npm audit` 실행 | Critical 취약점 확인 |
| 4 | NAS DSM 업데이트 확인 | DSM > 업데이트 및 복원 | 보안 패치 적용 |
| 5 | 감사 로그 점검 | UI > Logs 페이지 | 비정상 접근 패턴 확인 |

---

## 4. 모니터링

### 4.1 핵심 모니터링 항목

| 메트릭 | 정상 범위 | 경고 기준 | 확인 방법 |
|--------|-----------|-----------|-----------|
| 컨테이너 상태 | Up (healthy) | Unhealthy 또는 Exit | `docker-compose ps` |
| 메모리 사용량 | < 200MB | > 300MB | `docker stats trainbot` |
| DB 파일 크기 | < 50MB (1년 기준) | > 100MB | `ls -lh data/trainbot.db` |
| 에러 로그 빈도 | < 5건/일 | > 20건/일 | `wc -l data/logs/error-*.log` |
| 스케줄 실행 | 예정 시간 ±1분 | 미실행 또는 연속 실패 | Logs 페이지 |
| 외부 API 성공률 | > 95% | < 80% | 애플리케이션 로그 |

### 4.2 리소스 모니터링

```bash
# 컨테이너 실시간 리소스 확인
docker stats trainbot --no-stream

# 출력 예시:
# CONTAINER   CPU %   MEM USAGE / LIMIT   MEM %   NET I/O     BLOCK I/O
# trainbot    0.12%   85MiB / 2GiB        4.25%   1.2MB/500KB 10MB/5MB

# NAS 전체 리소스
cat /proc/meminfo | head -5
df -h /volume1
```

### 4.3 로그 확인

```bash
# 오늘의 애플리케이션 로그
cat data/logs/app-$(date +%Y-%m-%d).log

# 오늘의 에러 로그
cat data/logs/error-$(date +%Y-%m-%d).log

# 특정 키워드 검색 (예: 텔레그램 발송 실패)
grep -i "telegram.*fail" data/logs/app-$(date +%Y-%m-%d).log

# 특정 run_id의 로그 추적
grep "run_id=123" data/logs/app-$(date +%Y-%m-%d).log

# Docker 컨테이너 stdout 로그 (최근 50줄)
docker-compose logs --tail=50
```

**로그 레벨 정의**:

| 레벨 | 설명 | 예시 |
|------|------|------|
| ERROR | 즉시 확인 필요 | 외부 API 실패, DB 에러, 인증 오류 |
| WARN | 주의 관찰 필요 | dedupe 스킵, 재시도 발생, 설정 누락 |
| INFO | 정상 운영 정보 | 검색 실행/완료, 스케줄 트리거, 로그인/로그아웃 |
| DEBUG | 상세 디버깅 (개발 시) | 요청/응답 상세, 스코어링 과정 |

---

## 5. 장애 대응 절차

### 5.1 장애 등급 정의

| 등급 | 정의 | 예시 | 대응 시간 |
|------|------|------|-----------|
| **Critical** | 시스템 접속 불가 또는 핵심 기능 전면 장애 | 컨테이너 다운, DB 손상, 로그인 불가 | 즉시 |
| **Major** | 주요 기능 일부 장애 | 검색 실행 실패, 텔레그램 발송 불가, 스케줄 미동작 | 4시간 이내 |
| **Minor** | 부가 기능 장애 또는 불편 | UI 깨짐, 감사 로그 누락, 속도 저하 | 1일 이내 |

### 5.2 주요 장애 시나리오별 대응

#### 시나리오 1: 컨테이너 다운 (서비스 접속 불가)

| 항목 | 내용 |
|------|------|
| **증상** | 웹 페이지 접속 불가, `docker-compose ps`에서 Exited 표시 |
| **등급** | Critical |

| 순서 | 조치 | 명령어 |
|------|------|--------|
| 1 | 컨테이너 상태 확인 | `docker-compose ps` |
| 2 | 종료 로그 확인 | `docker-compose logs --tail=50` |
| 3 | 컨테이너 재시작 | `docker-compose up -d` |
| 4 | 헬스체크 확인 | `curl -s http://localhost:8080/health` |
| 5 | (실패 시) .env 파일 확인 | `cat .env` — 필수 변수 누락 여부 |
| 6 | (실패 시) 디스크 공간 확인 | `df -h /volume1` |
| 7 | (실패 시) Docker 데몬 상태 | `docker info` |
| 8 | (실패 시) NAS 재부팅 | DSM > 제어판 > 전원 > 재시작 |

#### 시나리오 2: 검색 실행 실패

| 항목 | 내용 |
|------|------|
| **증상** | 수동/스케줄 검색 시 에러, runs.status=ERROR |
| **등급** | Major |

| 순서 | 조치 | 명령어 |
|------|------|--------|
| 1 | 에러 로그 확인 | `grep "ERROR.*run" data/logs/error-$(date +%Y-%m-%d).log` |
| 2 | 외부 API 응답 확인 | 로그에서 SRT/KTX API 응답 코드 확인 |
| 3 | (외부 API 문제) 대기 후 재시도 | UI에서 수동 검색 재실행 |
| 4 | (DB 문제) DB 무결성 확인 | `sqlite3 data/trainbot.db "PRAGMA integrity_check;"` |
| 5 | (설정 문제) 설정 확인 | UI > Settings 페이지에서 설정값 확인 |

#### 시나리오 3: 텔레그램 발송 실패

| 항목 | 내용 |
|------|------|
| **증상** | 검색은 성공하지만 텔레그램 메시지 미수신 |
| **등급** | Major |

| 순서 | 조치 | 명령어 |
|------|------|--------|
| 1 | 에러 로그 확인 | `grep "telegram" data/logs/error-$(date +%Y-%m-%d).log` |
| 2 | Bot Token 유효성 확인 | `curl "https://api.telegram.org/bot{TOKEN}/getMe"` |
| 3 | Chat ID 확인 | `curl "https://api.telegram.org/bot{TOKEN}/getUpdates"` |
| 4 | .env 파일 변수 확인 | TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID |
| 5 | dedupe 테이블 확인 | 동일 결과 중복 차단 여부 (의도적 스킵일 수 있음) |
| 6 | 네트워크 확인 | NAS에서 외부 API 접근 가능 여부 |

#### 시나리오 4: 스케줄 미동작

| 항목 | 내용 |
|------|------|
| **증상** | 등록된 스케줄 시간에 자동 검색 미실행 |
| **등급** | Major |

| 순서 | 조치 | 명령어 |
|------|------|--------|
| 1 | 스케줄 활성 상태 확인 | UI > Schedule 페이지 > enabled 여부 |
| 2 | 시간대 확인 | `docker exec trainbot date` — Asia/Seoul 확인 |
| 3 | 로그에서 cron 트리거 확인 | `grep "schedule.*trigger" data/logs/app-*.log` |
| 4 | 컨테이너 재시작 | `docker-compose restart` (node-cron 초기화) |

#### 시나리오 5: DB 손상/잠금

| 항목 | 내용 |
|------|------|
| **증상** | "database is locked" 에러 반복, 데이터 조회/저장 실패 |
| **등급** | Critical |

| 순서 | 조치 | 명령어 |
|------|------|--------|
| 1 | 컨테이너 중지 | `docker-compose down` |
| 2 | DB 무결성 검사 | `sqlite3 data/trainbot.db "PRAGMA integrity_check;"` |
| 3 | WAL 체크포인트 강제 실행 | `sqlite3 data/trainbot.db "PRAGMA wal_checkpoint(TRUNCATE);"` |
| 4 | (손상 시) 백업에서 복원 | `cp data/backup/trainbot-YYYYMMDD.db data/trainbot.db` |
| 5 | 컨테이너 재시작 | `docker-compose up -d` |
| 6 | 데이터 확인 | UI에서 주요 데이터 조회 |

#### 시나리오 6: 디스크 공간 부족

| 항목 | 내용 |
|------|------|
| **증상** | "no space left on device" 에러, 컨테이너 비정상 |
| **등급** | Critical |

| 순서 | 조치 | 명령어 |
|------|------|--------|
| 1 | 디스크 사용 현황 확인 | `df -h /volume1` |
| 2 | Docker 이미지/볼륨 정리 | `docker system prune -f` |
| 3 | 오래된 로그 삭제 | `find data/logs/ -name "*.log" -mtime +30 -delete` |
| 4 | 오래된 백업 삭제 | `find data/backup/ -name "*.db" -mtime +30 -delete` |
| 5 | NAS 휴지통 비우기 | DSM > 공유 폴더 > 휴지통 비우기 |
| 6 | 컨테이너 재시작 | `docker-compose up -d` |

---

## 6. 백업/복구

### 6.1 백업 스케줄 및 보존 정책

| 대상 | 백업 유형 | 주기 | 보존 기간 | 저장 위치 |
|------|----------|------|-----------|-----------|
| SQLite DB | 파일 복사 (Full) | 일 1회 (새벽 3시) | 30일 | `/data/backup/` |
| 환경변수 (.env) | 수동 백업 | 변경 시 | 무제한 | Git 또는 별도 저장 |
| 자격증명 (.env.credentials) | 수동 백업 | 변경 시 | 무제한 | 안전한 별도 저장소 |
| Docker 설정 | Git 관리 | 변경 시 | 무제한 | Git 저장소 |

### 6.2 자동 백업 설정

NAS 작업 스케줄러에 등록:

**DSM > 제어판 > 작업 스케줄러 > 생성 > 예약된 작업 > 사용자 정의 스크립트**

- **작업명**: TrainBot DB 백업
- **실행 주기**: 매일 03:00
- **실행 사용자**: root

```bash
#!/bin/bash
BACKUP_DIR="/volume1/docker/trainbot/data/backup"
DB_PATH="/volume1/docker/trainbot/data/trainbot.db"
DATE=$(date +%Y%m%d)

# 백업 디렉토리 생성
mkdir -p "$BACKUP_DIR"

# DB 파일 복사 (WAL 체크포인트 후)
sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/trainbot-$DATE.db'"

# 30일 이전 백업 삭제
find "$BACKUP_DIR" -name "trainbot-*.db" -mtime +30 -delete

# 30일 이전 로그 삭제
find "/volume1/docker/trainbot/data/logs" -name "*.log" -mtime +30 -delete
```

### 6.3 수동 백업

```bash
# 즉시 DB 백업
sqlite3 /volume1/docker/trainbot/data/trainbot.db \
  ".backup '/volume1/docker/trainbot/data/backup/trainbot-manual-$(date +%Y%m%d%H%M).db'"

# 전체 data 디렉토리 백업 (tar)
tar czf /volume1/backup/trainbot-full-$(date +%Y%m%d).tar.gz \
  -C /volume1/docker/trainbot data/
```

### 6.4 복구 절차

| 항목 | 내용 |
|------|------|
| **RTO (복구 시간 목표)** | 30분 |
| **RPO (복구 시점 목표)** | 최대 24시간 (일일 백업 기준) |

```bash
# 1. 컨테이너 중지
cd /volume1/docker/trainbot
docker-compose down

# 2. 현재 DB 보존 (안전장치)
cp data/trainbot.db data/trainbot.db.broken

# 3. 백업에서 복원 (원하는 날짜 선택)
cp data/backup/trainbot-20260301.db data/trainbot.db

# 4. WAL/SHM 파일 삭제 (깨끗한 시작)
rm -f data/trainbot.db-wal data/trainbot.db-shm

# 5. 컨테이너 재시작
docker-compose up -d

# 6. 데이터 확인
curl -s http://localhost:8080/health
```

---

## 7. 업데이트 절차

### 7.1 일반 업데이트 (코드 변경)

```bash
cd /volume1/docker/trainbot

# 1. DB 백업 (필수)
sqlite3 data/trainbot.db ".backup 'data/backup/trainbot-pre-update-$(date +%Y%m%d%H%M).db'"

# 2. 소스 코드 업데이트
git pull origin main
# 또는 파일 직접 교체

# 3. 재빌드 + 재기동
docker-compose up -d --build

# 4. 마이그레이션 확인
docker-compose logs --tail=30 | grep -i "migration"

# 5. 스모크 테스트
curl -s http://localhost:8080/health
# 브라우저에서 로그인 → 검색 실행 확인
```

### 7.2 Docker 기반 이미지 업데이트

```bash
cd /volume1/docker/trainbot

# 1. DB 백업
sqlite3 data/trainbot.db ".backup 'data/backup/trainbot-pre-update-$(date +%Y%m%d%H%M).db'"

# 2. 컨테이너 중지
docker-compose down

# 3. 이미지 재빌드 (새 base 이미지 적용)
docker-compose build --no-cache

# 4. 재기동
docker-compose up -d

# 5. 오래된 이미지 정리
docker image prune -f
```

### 7.3 환경변수 변경

```bash
# 1. .env 파일 편집
vi /volume1/docker/trainbot/.env

# 2. 컨테이너 재시작 (환경변수 리로드)
docker-compose restart

# 3. 확인
docker-compose logs --tail=10
```

---

## 8. 데이터 관리

### 8.1 데이터 보존 정책

| 데이터 | 보존 기간 | 정리 방법 | 비고 |
|--------|-----------|-----------|------|
| runs (실행 이력) | 1년 | 수동 또는 자동 정리 스크립트 | 핵심 데이터 |
| week_plans (주간 계획) | 무제한 | - | 크기 미미 |
| audit_logs (감사 로그) | 1년 | 1년 초과 자동 삭제 | 규정 준수 |
| dedupe (중복 방지) | 자동 만료 | expired_at 기준 자동 정리 | 180분 윈도우 |
| sessions (세션) | 자동 만료 | connect-sqlite3 자동 정리 | 세션 만료 시 |
| 애플리케이션 로그 | 30일 | 자동 삭제 스크립트 | 일별 로테이션 |
| DB 백업 | 30일 | 자동 삭제 스크립트 | 일별 백업 |

### 8.2 데이터 정리 쿼리

```sql
-- 1년 이전 감사 로그 삭제
DELETE FROM audit_logs
WHERE created_at < datetime('now', '-1 year');

-- 만료된 dedupe 레코드 삭제
DELETE FROM dedupe
WHERE expires_at < datetime('now');

-- 1년 이전 실행 이력 삭제 (선택적)
DELETE FROM runs
WHERE created_at < datetime('now', '-1 year');

-- SQLite 공간 회수
VACUUM;
```

### 8.3 DB 직접 접근

```bash
# 컨테이너 외부에서 (NAS 셸)
sqlite3 /volume1/docker/trainbot/data/trainbot.db

# 컨테이너 내부에서
docker exec -it trainbot sqlite3 /data/trainbot.db

# 유용한 조회 쿼리
sqlite3 data/trainbot.db "SELECT count(*) FROM users WHERE status='ACTIVE';"
sqlite3 data/trainbot.db "SELECT count(*) FROM runs;"
sqlite3 data/trainbot.db "SELECT count(*) FROM audit_logs;"
sqlite3 data/trainbot.db "PRAGMA integrity_check;"
sqlite3 data/trainbot.db "PRAGMA page_count; PRAGMA page_size;"  -- DB 크기 확인
```

---

## 9. 보안 운영

### 9.1 보안 체크리스트

| # | 항목 | 확인 주기 | 확인 방법 |
|---|------|-----------|-----------|
| 1 | .env.credentials 파일 권한 | 주간 | `ls -la data/.env.credentials` → `-rw-------` |
| 2 | 감사 로그 이상 접근 패턴 | 월간 | UI > Logs 페이지에서 비정상 패턴 확인 |
| 3 | ACTIVE 사용자 수 확인 | 월간 | UI > Admin 페이지에서 4명 이하 확인 |
| 4 | npm audit 취약점 | 월간 | `docker exec trainbot npm audit` |
| 5 | NAS 방화벽 설정 | 분기 | DSM > 제어판 > 보안 > 방화벽 |
| 6 | DB에 민감정보 미저장 확인 | 분기 | `sqlite3 data/trainbot.db "SELECT * FROM config;"` — 비밀번호 등 미포함 |

### 9.2 접근 제어

| 접근 대상 | 허용 대상 | 방법 |
|-----------|-----------|------|
| TrainBot 웹 UI | 내부망 사용자 (카카오 인증) | 카카오 OAuth + 세션 |
| NAS SSH | 관리자만 | SSH 키 인증 권장 |
| Docker 관리 | 관리자만 | NAS 계정 권한 |
| .env / .env.credentials | 관리자만 | 파일 시스템 권한 |
| SQLite DB 직접 접근 | 관리자만 | NAS SSH + 파일 권한 |

---

## 10. 자주 묻는 질문 (FAQ)

### Q1. 컨테이너가 계속 재시작됩니다

**원인 가능성**: .env 필수 변수 누락, DB 파일 권한 문제, 포트 충돌

**확인 방법**:
```bash
docker-compose logs --tail=50
# 에러 메시지에서 원인 파악
```

### Q2. 카카오 로그인이 안 됩니다

**원인 가능성**: KAKAO_CALLBACK_URL 불일치, 카카오 앱 설정 오류

**확인 방법**:
1. `.env`의 `KAKAO_CALLBACK_URL` 확인
2. 카카오 개발자 콘솔 > 앱 설정 > Redirect URI 일치 확인
3. NAS의 실제 접속 IP/포트와 일치하는지 확인

### Q3. 검색 결과가 항상 0건입니다

**원인 가능성**: 선호시간대 미설정, 외부 API 장애, 설정 오류

**확인 방법**:
1. Settings 페이지에서 요일별 컷오프 설정 확인
2. 에러 로그에서 외부 API 응답 확인
3. 검색하는 요일에 해당하는 설정이 있는지 확인

### Q4. 텔레그램 알림이 안 옵니다

**원인 가능성**: Bot Token/Chat ID 오류, dedupe 중복 차단, 네트워크 차단

**확인 방법**:
1. `.env`의 TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID 확인
2. Logs 페이지에서 "dedupe skip" 여부 확인
3. `curl https://api.telegram.org` 접근 가능 여부

### Q5. NAS 재부팅 후 서비스가 안 뜹니다

**확인 방법**:
```bash
cd /volume1/docker/trainbot
docker-compose ps
# Exited 상태이면:
docker-compose up -d
```

> `restart: unless-stopped` 설정으로 NAS 재부팅 시 자동 기동되어야 합니다. 안 되면 DSM > Docker에서 컨테이너 자동 시작 설정을 확인하세요.

### Q6. DB를 초기화하고 싶습니다

```bash
cd /volume1/docker/trainbot
docker-compose down
rm data/trainbot.db data/trainbot.db-wal data/trainbot.db-shm
docker-compose up -d
# 마이그레이션이 자동으로 새 DB를 생성합니다
```

> **주의**: 모든 데이터가 삭제됩니다. 반드시 백업 후 진행하세요.

---

## 부록

### A. 유용한 명령어 모음

```bash
# === 컨테이너 관리 ===
docker-compose ps                    # 상태 확인
docker-compose logs -f               # 실시간 로그
docker-compose restart               # 재시작
docker-compose up -d --build         # 재빌드 + 재시작
docker-compose down                  # 중지 + 제거
docker exec -it trainbot sh          # 컨테이너 셸 접속
docker stats trainbot --no-stream    # 리소스 사용량

# === DB 관리 ===
sqlite3 data/trainbot.db             # DB 접속
sqlite3 data/trainbot.db ".tables"   # 테이블 목록
sqlite3 data/trainbot.db "PRAGMA integrity_check;"  # 무결성 검사
sqlite3 data/trainbot.db ".backup 'data/backup/manual.db'"  # 백업

# === 로그 확인 ===
tail -f data/logs/app-$(date +%Y-%m-%d).log     # 실시간 앱 로그
tail -f data/logs/error-$(date +%Y-%m-%d).log   # 실시간 에러 로그
grep "ERROR" data/logs/app-*.log | tail -20     # 최근 에러 20건

# === 시스템 ===
df -h /volume1                       # 디스크 사용량
free -h                              # 메모리 사용량
curl -s http://localhost:8080/health # 헬스체크
```

### B. 환경변수 템플릿 (.env.example)

```env
# === 필수 ===
NODE_ENV=production
TZ=Asia/Seoul
SESSION_SECRET=your-random-session-secret-32chars-min

# === 카카오 OAuth ===
KAKAO_CLIENT_ID=your-kakao-client-id
KAKAO_CLIENT_SECRET=your-kakao-client-secret
KAKAO_CALLBACK_URL=http://192.168.x.x:8080/auth/kakao/callback

# === 텔레그램 ===
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_CHAT_ID=-100xxxxxxxxxx

# === 선택 ===
PORT=3000
DB_PATH=/data/trainbot.db
LOG_PATH=/data/logs
```
