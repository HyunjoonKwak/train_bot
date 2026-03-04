# API 설계서

| 항목 | 내용 |
|------|------|
| **프로젝트명** | TrainBot — 김천구미↔동탄 주간 예매 어시스턴트 |
| **문서 버전** | v1.0 |
| **작성일** | 2026-03-02 |
| **작성자** | 프로젝트 오너 |
| **문서 상태** | 초안 |

---

## 1. API 설계 원칙

### 1.1 RESTful 설계 규칙

| 규칙 | 설명 | 예시 |
|------|------|------|
| 자원 중심 URL | URL은 자원(명사) 표현 | `GET /api/runs` (O) |
| 소문자 + 하이픈 | 복합 단어 구분 | `/api/week-plans` |
| 행위 자원 | 동사가 필요한 경우 허용 | `POST /api/week-plans/search` |

### 1.2 버저닝 전략

| 항목 | 내용 |
|------|------|
| 방식 | URL Path 없음 (v1 단일 버전, /api/ 프리픽스) |
| 현재 버전 | v1 (암묵적) |
| URL 패턴 | `/api/[resource]`, `/auth/[action]` |

### 1.3 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| URL 경로 | kebab-case | `/api/week-plans` |
| Query Parameter | snake_case | `?status=PENDING` |
| Request/Response Body | snake_case | `{ "search_range_weeks": 4 }` |
| 에러 코드 | UPPER_SNAKE_CASE | `USER_NOT_FOUND` |

### 1.4 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| v1.0 | 2026-03-02 | 프로젝트 오너 | 초안 작성 (SRS v1.3 기반, 22개 엔드포인트) |

---

## 2. 인증/인가

### 2.1 인증 방식

| 방식 | 용도 | 전달 |
|------|------|------|
| 세션 쿠키 | 사용자 인증 (웹) | `Cookie: connect.sid={session_id}` |
| 카카오 OAuth 2.0 | 로그인 | 표준 OAuth 2.0 Authorization Code Flow |

### 2.2 세션 관리

| 항목 | 내용 |
|------|------|
| 세션 스토어 | SQLite (또는 인메모리) |
| 세션 만료 | 24시간 (비활성 기준) |
| 쿠키 설정 | `httpOnly: true`, `secure: true` (HTTPS 시), `sameSite: lax` |

### 2.3 접근 제어 (RBAC)

| 역할 | 설명 | 접근 가능 범위 |
|------|------|---------------|
| Admin | 관리자 | 모든 API |
| Member | 일반 사용자 | 조회/실행 API (설정 변경/관리 불가) |
| 미인증 | 로그인 전 | 인증 API만 (/auth/*) |

---

## 3. 공통 스펙

### 3.1 요청 공통

| 항목 | 내용 |
|------|------|
| Content-Type | `application/json` |
| 문자 인코딩 | UTF-8 |
| 시간 형식 | ISO 8601 (`2026-03-02T14:30:00+09:00`) |

### 3.2 응답 공통 포맷

**성공 응답:**

```json
{
  "success": true,
  "data": { ... }
}
```

**목록 응답 (페이지네이션):**

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

**오류 응답:**

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "사용자에게 표시할 메시지"
  }
}
```

### 3.3 공통 에러 코드

| HTTP Status | 에러 코드 | 설명 |
|-------------|-----------|------|
| 400 | INVALID_INPUT | 입력값 검증 실패 |
| 401 | UNAUTHORIZED | 인증 필요 (로그인 안 됨) |
| 403 | FORBIDDEN | 권한 부족 (Admin 전용 API에 Member 접근) |
| 404 | NOT_FOUND | 리소스를 찾을 수 없음 |
| 409 | CONFLICT | 중복/충돌 (예: 실행 중복) |
| 429 | RATE_LIMITED | 요청 제한 초과 |
| 500 | INTERNAL_ERROR | 서버 내부 오류 |

### 3.4 Rate Limiting

| 대상 | 제한 | 비고 |
|------|------|------|
| 전체 API | 60 req/min (세션 기준) | 소규모 시스템, 관대한 제한 |
| 외부 API 호출 (SRT/KTX) | 시스템 내부 제어 | 요청 간 최소 1초 간격 |

---

## 4. API 엔드포인트 상세

### 4.1 인증 API

---

#### `GET /auth/kakao/login`

카카오 OAuth 로그인을 시작한다.

| 항목 | 내용 |
|------|------|
| **인증** | 불필요 |
| **관련 FR** | FR-001 |

**응답:** 카카오 OAuth 인증 페이지로 302 리다이렉트

---

#### `GET /auth/kakao/callback`

카카오 OAuth 콜백을 처리한다.

| 항목 | 내용 |
|------|------|
| **인증** | 불필요 (카카오에서 호출) |
| **관련 FR** | FR-001 |

**Query Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| code | String | 필수 | 카카오 Authorization Code |

**처리 로직:**
1. Authorization Code로 Access Token 요청
2. kakao_id로 사용자 조회
3. 신규: ACTIVE 0명이면 Admin+ACTIVE, < 4명이면 PENDING, 4명이면 거부
4. 기존: 상태 확인 (ACTIVE → 세션 발급, PENDING/REJECTED/DISABLED → 거부)

**성공 응답:** Dashboard로 302 리다이렉트 (세션 쿠키 설정)

**에러 응답:**

| 코드 | 설명 |
|------|------|
| USER_PENDING | 관리자 승인 대기 중 |
| USER_REJECTED | 가입 거절됨 |
| USER_DISABLED | 비활성화됨 |
| CAPACITY_FULL | 정원 초과 (4명) |

---

#### `POST /auth/logout`

로그아웃한다.

| 항목 | 내용 |
|------|------|
| **인증** | 필수 |
| **관련 FR** | FR-002 |

**응답:**

```json
{ "success": true, "data": { "message": "로그아웃되었습니다" } }
```

---

### 4.2 사용자 관리 API

---

#### `GET /api/admin/users`

사용자 목록을 조회한다.

| 항목 | 내용 |
|------|------|
| **인증** | Admin 전용 |
| **관련 FR** | FR-003 |

**Query Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| status | String | 선택 | PENDING / ACTIVE / REJECTED / DISABLED |

**응답:**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "kakao_id": "12345",
        "name": "홍길동",
        "role": "ADMIN",
        "status": "ACTIVE",
        "created_at": "2026-03-02T10:00:00+09:00"
      }
    ],
    "active_count": 2,
    "max_users": 4
  }
}
```

---

#### `POST /api/admin/users/{id}/approve`

사용자를 승인한다 (PENDING → ACTIVE).

| 항목 | 내용 |
|------|------|
| **인증** | Admin 전용 |
| **관련 FR** | FR-003 |

**에러:**

| 코드 | 설명 |
|------|------|
| CAPACITY_FULL | ACTIVE 사용자가 이미 4명 |
| USER_NOT_PENDING | 대상이 PENDING 상태가 아님 |

---

#### `POST /api/admin/users/{id}/reject`

사용자를 거절한다 (PENDING → REJECTED).

| 항목 | 내용 |
|------|------|
| **인증** | Admin 전용 |
| **관련 FR** | FR-003 |

---

#### `POST /api/admin/users/{id}/disable`

사용자를 비활성화한다 (ACTIVE → DISABLED).

| 항목 | 내용 |
|------|------|
| **인증** | Admin 전용 |
| **관련 FR** | FR-003 |

**에러:**

| 코드 | 설명 |
|------|------|
| CANNOT_DISABLE_SELF | 자기 자신을 비활성화할 수 없음 |

---

### 4.3 설정 API

---

#### `GET /api/config`

시스템 설정을 조회한다.

| 항목 | 내용 |
|------|------|
| **인증** | 필수 (Admin/Member) |
| **관련 FR** | FR-015 |

**응답:** config_json 전체 (SRS 6.3절 스키마 참조)

---

#### `PUT /api/config`

시스템 설정을 변경한다.

| 항목 | 내용 |
|------|------|
| **인증** | Admin 전용 |
| **관련 FR** | FR-015 |

**Request Body:** 변경할 설정 필드 (부분 업데이트, deep merge)

```json
{
  "preferences": {
    "time_rules": {
      "up": { "금": 18, "토": 9 }
    }
  },
  "search_range": {
    "default_weeks": 2
  }
}
```

**응답:**

```json
{
  "success": true,
  "data": {
    "config": { ... },
    "diff": {
      "preferences.time_rules.up.토": { "old": 8, "new": 9 },
      "search_range.default_weeks": { "old": 1, "new": 2 }
    }
  }
}
```

---

### 4.4 실행 API

---

#### `POST /api/run`

수동 검색을 실행한다.

| 항목 | 내용 |
|------|------|
| **인증** | 필수 (Admin/Member) |
| **관련 FR** | FR-011 |

**Request Body:**

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| start_from | String | 필수 | - | "this" 또는 "next" |
| search_range_weeks | Integer | 필수 | 1 | 1~8 |
| excluded_weeks | Integer[] | 선택 | [] | 제외할 주 인덱스 (0-based) |
| notify | Boolean | 선택 | true | 텔레그램 발송 여부 |

**응답:**

```json
{
  "success": true,
  "data": {
    "run_id": 42,
    "status": "RUNNING",
    "started_at": "2026-03-02T14:30:00+09:00"
  }
}
```

**에러:**

| 코드 | 설명 |
|------|------|
| ALREADY_RUNNING | 이미 실행 중 |
| INVALID_RANGE | 검색 범위 1~8 벗어남 |
| ALL_WEEKS_EXCLUDED | 모든 주 제외됨 |

---

#### `GET /api/runs`

실행 목록을 조회한다.

| 항목 | 내용 |
|------|------|
| **인증** | 필수 |
| **관련 FR** | FR-011 |

**Query Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| page | Integer | 페이지 번호 (기본 1) |
| page_size | Integer | 페이지 크기 (기본 20) |
| status | String | RUNNING / SUCCESS / FAILED |

---

#### `GET /api/runs/{id}`

실행 상세를 조회한다.

| 항목 | 내용 |
|------|------|
| **인증** | 필수 |
| **관련 FR** | FR-011 |

**응답:**

```json
{
  "success": true,
  "data": {
    "id": 42,
    "search_range_weeks": 2,
    "start_from": "this",
    "excluded_weeks": [1],
    "status": "SUCCESS",
    "started_at": "2026-03-02T14:30:00+09:00",
    "finished_at": "2026-03-02T14:30:15+09:00",
    "result": {
      "weeks": [
        {
          "week_index": 0,
          "week_start": "2026-03-02",
          "up": {
            "direct": [ { "departure": "김천구미", "arrival": "동탄", "depart_time": "18:30", "arrive_time": "19:20", "duration_min": 50, "score": 95, "tags": ["직행", "SRT"] } ],
            "transfer": [ ]
          },
          "down": { "direct": [], "transfer": [] }
        }
      ]
    }
  }
}
```

---

### 4.5 텔레그램 API

---

#### `POST /api/notify/telegram`

텔레그램 알림을 발송한다.

| 항목 | 내용 |
|------|------|
| **인증** | 필수 |
| **관련 FR** | FR-010 |

**Request Body:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| run_id | Integer | 필수 | 발송할 실행 ID |

**응답:**

```json
{
  "success": true,
  "data": {
    "sent": true,
    "deduped": false,
    "message_count": 2
  }
}
```

**에러:**

| 코드 | 설명 |
|------|------|
| DEDUPED | 동일 결과 중복 (180분 윈도우) |
| TELEGRAM_ERROR | 텔레그램 API 오류 |

---

### 4.6 스케줄 API

---

#### `GET /api/schedules`

스케줄 목록을 조회한다.

| 항목 | 내용 |
|------|------|
| **인증** | Admin 전용 |
| **관련 FR** | FR-012 |

---

#### `POST /api/schedules`

스케줄을 생성한다.

| 항목 | 내용 |
|------|------|
| **인증** | Admin 전용 |
| **관련 FR** | FR-012 |

**Request Body:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| name | String | 필수 | 스케줄 이름 |
| cron | String | 필수 | 크론 표현식 |
| start_from | String | 필수 | "this" / "next" |
| search_range_weeks | Integer | 필수 | 1~8 |
| enabled | Boolean | 필수 | 활성 여부 |

---

#### `PATCH /api/schedules/{id}`

스케줄을 수정한다 (부분 업데이트).

| 항목 | 내용 |
|------|------|
| **인증** | Admin 전용 |
| **관련 FR** | FR-012 |

---

#### `DELETE /api/schedules/{id}`

스케줄을 삭제한다.

| 항목 | 내용 |
|------|------|
| **인증** | Admin 전용 |
| **관련 FR** | FR-012 |

---

### 4.7 주간 캘린더 API

---

#### `GET /api/week-plans`

주간 캘린더 목록을 조회한다.

| 항목 | 내용 |
|------|------|
| **인증** | 필수 |
| **관련 FR** | FR-018 |

**Query Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| from | Date | 시작 날짜 (기본: 이번 주 월요일) |
| weeks | Integer | 조회 주 수 (기본: 8) |

**응답:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "week_start_date": "2026-03-02",
      "status": "NEEDED",
      "memo": "",
      "last_run_id": null,
      "updated_at": "2026-03-02T10:00:00+09:00"
    }
  ]
}
```

---

#### `PUT /api/week-plans/{id}`

주의 상태/메모를 변경한다.

| 항목 | 내용 |
|------|------|
| **인증** | 필수 |
| **관련 FR** | FR-018 |

**Request Body:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| status | String | 선택 | NEEDED / BOOKED / NOT_NEEDED |
| memo | String | 선택 | 주별 메모 |

---

#### `POST /api/week-plans/search`

선택한 주에 대해 검색을 실행한다.

| 항목 | 내용 |
|------|------|
| **인증** | 필수 |
| **관련 FR** | FR-018 |

**Request Body:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| week_plan_ids | Integer[] | 필수 | 검색할 주 ID 목록 |
| notify | Boolean | 선택 | 텔레그램 발송 여부 (기본 true) |

**처리:**
1. 지정된 week_plan의 상태를 SEARCHING으로 변경
2. 각 주에 대해 추천 검색 실행
3. 완료 시 RECOMMENDED + last_run_id 업데이트
4. 실패 시 NEEDED로 롤백

---

### 4.8 자격증명 API

---

#### `GET /api/credentials`

결제 수단/계정 목록을 조회한다 (마스킹).

| 항목 | 내용 |
|------|------|
| **인증** | Admin 전용 |
| **관련 FR** | FR-019 |

**응답:**

```json
{
  "success": true,
  "data": {
    "credentials": [
      { "key": "BOOKING_SRT_MEMBER_ID", "category": "예매 계정", "label": "SRT 회원번호", "masked_value": "1234****", "is_set": true },
      { "key": "BOOKING_SRT_PASSWORD", "category": "예매 계정", "label": "SRT 비밀번호", "masked_value": null, "is_set": true },
      { "key": "PAYMENT_METHOD_ALIAS", "category": "결제 수단", "label": "결제 수단 별칭", "masked_value": null, "is_set": false }
    ]
  }
}
```

---

#### `PUT /api/credentials`

결제 수단/계정을 저장한다 (전체 덮어쓰기).

| 항목 | 내용 |
|------|------|
| **인증** | Admin 전용 |
| **관련 FR** | FR-019 |

**Request Body:**

```json
{
  "credentials": {
    "BOOKING_SRT_MEMBER_ID": "12345678",
    "BOOKING_SRT_PASSWORD": "newpassword"
  }
}
```

**처리:**
1. 입력값 검증
2. /data/.env.credentials 파일에 덮어쓰기
3. 환경변수 리로드
4. 감사 로그 기록 (변경된 키 이름만, 값 절대 기록 안 함)

---

#### `DELETE /api/credentials/{key}`

특정 자격증명을 삭제한다.

| 항목 | 내용 |
|------|------|
| **인증** | Admin 전용 |
| **관련 FR** | FR-019 |

**Path Parameters:**

| 파라미터 | 설명 |
|----------|------|
| key | 삭제할 환경변수 키 (예: BOOKING_SRT_PASSWORD) |

---

### 4.9 헬스체크 API

---

#### `GET /health`

서비스 상태를 확인한다.

| 항목 | 내용 |
|------|------|
| **인증** | 불필요 |

**응답:**

```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime_seconds": 86400,
  "db": "connected"
}
```

---

## 5. API 엔드포인트 전체 목록

| # | Method | Endpoint | 설명 | 인증 | 관련 FR |
|---|--------|----------|------|------|---------|
| 1 | GET | /auth/kakao/login | 카카오 OAuth 시작 | 불필요 | FR-001 |
| 2 | GET | /auth/kakao/callback | 카카오 OAuth 콜백 | 불필요 | FR-001 |
| 3 | POST | /auth/logout | 로그아웃 | 필수 | FR-002 |
| 4 | GET | /api/admin/users | 사용자 목록 | Admin | FR-003 |
| 5 | POST | /api/admin/users/{id}/approve | 사용자 승인 | Admin | FR-003 |
| 6 | POST | /api/admin/users/{id}/reject | 사용자 거절 | Admin | FR-003 |
| 7 | POST | /api/admin/users/{id}/disable | 사용자 비활성화 | Admin | FR-003 |
| 8 | GET | /api/config | 설정 조회 | 필수 | FR-015 |
| 9 | PUT | /api/config | 설정 변경 | Admin | FR-015 |
| 10 | POST | /api/run | 수동 실행 | 필수 | FR-011 |
| 11 | GET | /api/runs | 실행 목록 | 필수 | FR-011 |
| 12 | GET | /api/runs/{id} | 실행 상세 | 필수 | FR-011 |
| 13 | POST | /api/notify/telegram | 텔레그램 발송 | 필수 | FR-010 |
| 14 | GET | /api/schedules | 스케줄 목록 | Admin | FR-012 |
| 15 | POST | /api/schedules | 스케줄 생성 | Admin | FR-012 |
| 16 | PATCH | /api/schedules/{id} | 스케줄 수정 | Admin | FR-012 |
| 17 | DELETE | /api/schedules/{id} | 스케줄 삭제 | Admin | FR-012 |
| 18 | GET | /api/week-plans | 주간 캘린더 목록 | 필수 | FR-018 |
| 19 | PUT | /api/week-plans/{id} | 주 상태/메모 변경 | 필수 | FR-018 |
| 20 | POST | /api/week-plans/search | 선택한 주 검색 | 필수 | FR-018 |
| 21 | GET | /api/credentials | 자격증명 조회 (마스킹) | Admin | FR-019 |
| 22 | PUT | /api/credentials | 자격증명 저장 | Admin | FR-019 |
| 23 | DELETE | /api/credentials/{key} | 자격증명 삭제 | Admin | FR-019 |
| 24 | GET | /health | 헬스체크 | 불필요 | - |

---

## 6. 외부 API 연동 스펙

### 6.1 SRT/KTX 열차 조회

| 항목 | 내용 |
|------|------|
| 프로토콜 | HTTPS |
| 인증 | 조회 방식에 따라 결정 (ISSUE-01 미결) |
| 재시도 | 지수 백오프, 최대 3회 |
| 요청 간격 | 최소 1초 |
| 타임아웃 | 10초 |

### 6.2 카카오 OAuth

| 항목 | 내용 |
|------|------|
| 인증 URL | https://kauth.kakao.com/oauth/authorize |
| 토큰 URL | https://kauth.kakao.com/oauth/token |
| 프로필 URL | https://kapi.kakao.com/v2/user/me |
| 필요 정보 | kakao_id, nickname |

### 6.3 Telegram Bot API

| 항목 | 내용 |
|------|------|
| Base URL | https://api.telegram.org/bot{token}/ |
| 메서드 | sendMessage |
| 파라미터 | chat_id, text, parse_mode=Markdown |
| 타임아웃 | 10초 |

---

> **본 문서는 SRS에 정의된 기능 요구사항을 기반으로 작성되었으며, 변경 시 SRS/RTM과 동시에 갱신한다.**
