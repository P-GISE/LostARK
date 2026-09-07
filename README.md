# Lost Ark Party Planner

로스트아크 공대와 고정 파티의 일정, 출석, 캐릭터 정보, 디스코드 알림을 관리하는 Next.js 기반 파티 모집/스케줄링 서비스입니다.

운영 URL:

```text
https://lostark-party.pigs0516.com
```

## 한눈에 보기

| 항목 | 내용 |
| --- | --- |
| 한국어 프로젝트명 | 로스트아크 파티 모집 서비스 |
| 저장소 성격 | 실제 운영까지 고려한 게임 커뮤니티 일정 관리 웹 서비스 |
| 주요 사용자 | 공대장, 고정 파티원, 레이드 참여자 |
| 실행 형태 | Next.js App Router 서버 애플리케이션 |
| DB | PostgreSQL + Prisma |
| 외부 연동 | Discord OAuth/봇, Lost Ark Open API |
| 운영 구성 | PC primary 서버와 AWS backup failover 실험 |

## 서비스 사용 흐름

1. 사용자가 회원가입하거나 초대 링크로 그룹에 들어옵니다.
2. 그룹장은 레이드 템플릿을 만들고 주간/일정 단위로 모집을 엽니다.
3. 멤버는 가능한 시간을 등록하고, 모집 카드에서 참여 의사를 표시합니다.
4. 그룹장은 가능 시간과 캐릭터 정보를 보며 파티 슬롯을 배정합니다.
5. 일정이 확정되면 참여자에게 Discord 알림 또는 리마인더가 전달됩니다.
6. 캐릭터 worker는 Lost Ark Open API를 통해 대표 캐릭터와 원정대 정보를 갱신합니다.
7. 운영자는 관리자 화면에서 사용자, 그룹, 일정 데이터를 관리합니다.

## 주요 기능

- 그룹 초대와 멤버 관리
- 레이드 일정 생성, 캘린더 조회, 템플릿 기반 반복 일정 관리
- 멤버별 가능 시간 등록과 미래 일정 생성 제한
- 캐릭터 슬롯 배정과 일정 상세 확인
- Lost Ark Open API 기반 대표 캐릭터/원정대 동기화
- Discord OAuth 연결과 일정 생성/리마인더 DM 알림
- 관리자용 사용자 정리와 그룹 관리
- 알림 worker, 캐릭터 동기화 worker
- PC 운영 서버와 AWS 백업 failover 구성

## 기술 스택

- Next.js App Router
- React 19
- TypeScript
- Prisma
- PostgreSQL
- Discord OAuth, discord.js
- Lost Ark Open API
- Vitest, Testing Library, Playwright
- Docker, Docker Compose
- Cloudflare Tunnel
- AWS EC2, Lambda, EventBridge

## 프로젝트 구조

```text
로스트아크 파티모집/
  src/app/                Next.js App Router 화면과 API route
  src/components/         UI 컴포넌트
  src/lib/                인증, 세션, 도메인 로직, 외부 API 연동
  src/worker/             알림과 캐릭터 동기화 worker
  prisma/                 DB schema, migration, seed
  tests/                  단위/통합 테스트
  scripts/                운영/검증 보조 스크립트
  infra/aws-failover/     AWS 백업 failover 구성
  docs/operations/        운영 문서
```

## 실행 방법

```bash
npm install
```

`.env.example`을 기준으로 `.env`를 생성하고 필수 환경변수를 채웁니다.

```bash
docker compose up -d postgres
npm run db:generate
npm run db:migrate
npm run dev
```

기본 개발 주소:

```text
http://localhost:3000
```

## 주요 환경변수

| 변수 | 설명 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 접속 문자열입니다. |
| `APP_BASE_URL` | 초대 링크, OAuth redirect, 공유 URL에 쓰는 앱 기준 주소입니다. |
| `APP_DOMAIN` | 세션 쿠키 도메인 판단에 사용합니다. |
| `SESSION_SECRET` | 세션 서명용 비밀값입니다. 공개 금지입니다. |
| `ADMIN_EMAILS` | 관리자 권한을 부여할 이메일 목록입니다. |
| `DISCORD_CLIENT_ID` | Discord OAuth 애플리케이션 ID입니다. |
| `DISCORD_CLIENT_SECRET` | Discord OAuth secret입니다. 공개 금지입니다. |
| `DISCORD_BOT_TOKEN` 또는 `DISCORD_TOKEN` | Discord DM/봇 기능용 토큰입니다. 공개 금지입니다. |
| `DISCORD_REDIRECT_URI` | Discord OAuth callback URL입니다. |
| `LOSTARK_OPEN_API_JWT` | Lost Ark Open API 인증 토큰입니다. 공개 금지입니다. |

실제 값은 `.env`에만 두고 GitHub에 커밋하지 않습니다.

## 주요 화면과 API

- `/`: 공개 소개와 시작 화면
- `/auth/login`, `/auth/signup`: 로그인과 회원가입
- `/groups/new`: 새 그룹 생성
- `/invite/[inviteCode]`: 초대 링크 입장
- `/weekly`, `/calendar`: 주간 일정과 캘린더
- `/schedules`, `/schedules/[scheduleId]`: 일정 목록과 상세
- `/sets`: 레이드 세트/파티 구성
- `/signup`: 모집 현황과 신청
- `/members`: 멤버와 캐릭터 관리
- `/notifications`: 알림 내역
- `/settings`: 그룹 운영 설정
- `/admin`: 관리자 대시보드
- `/api/bot/*`: Discord 봇이 사이트 데이터를 조회/변경하는 API

## 구현 포인트

- 게임 커뮤니티의 실제 운영 문제인 일정 확정, 출석 확인, 캐릭터 배정, 리마인더를 하나의 흐름으로 묶었습니다.
- Discord OAuth와 DM 알림을 서비스 흐름에 연결해 사용자가 별도 채팅 공지를 반복 확인하지 않아도 되게 했습니다.
- Lost Ark Open API 캐릭터 동기화를 worker로 분리해 화면 요청과 백그라운드 갱신 책임을 나눴습니다.
- 일정/가능 시간은 과거 데이터 생성 방지를 포함해 운영 실수를 줄이는 방향으로 검증합니다.
- PC-primary 운영과 AWS backup failover를 구성해 개인 서버 운영 환경에서도 장애 대응 흐름을 실험했습니다.

## 검증

```bash
npm test
npm run lint
npm run build
```

E2E 검증이 필요할 때:

```bash
npm run test:e2e
```

## 운영 worker

```bash
npm run worker:notifications
npm run worker:characters
```

- `worker:notifications`: 일정 생성/리마인더/봇 outbox 메시지 처리를 담당합니다.
- `worker:characters`: Lost Ark Open API를 이용해 캐릭터 정보를 주기적으로 갱신합니다.

## 운영 문서

- VPS 배포: `docs/vps-deployment.md`
- 단일 운영 DB 전환: `docs/operations/single-production-db-cutover.md`
- AWS failover: `infra/aws-failover/README.md`

## GitHub 업로드 전 주의

- `.env`, Discord secrets, Lost Ark API JWT, Cloudflare token, AWS key는 커밋하지 않습니다.
- `.next`, `node_modules`, `output`, `playwright-report`, `test-results`, 로그와 PID 파일은 업로드 대상에서 제외합니다.
