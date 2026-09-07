# Lost Ark Party Planner

로스트아크 공대와 고정 파티의 일정, 출석, 캐릭터 정보, 디스코드 알림을 관리하는 Next.js 기반 파티 모집/스케줄링 서비스입니다.

운영 URL:

```text
https://lostark-party.pigs0516.com
```

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

```text
DATABASE_URL
APP_BASE_URL
APP_DOMAIN
SESSION_SECRET
ADMIN_EMAILS
DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET
DISCORD_BOT_TOKEN
DISCORD_REDIRECT_URI
LOSTARK_OPEN_API_JWT
```

실제 값은 `.env`에만 두고 GitHub에 커밋하지 않습니다.

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

## 운영 문서

- VPS 배포: `docs/vps-deployment.md`
- 단일 운영 DB 전환: `docs/operations/single-production-db-cutover.md`
- AWS failover: `infra/aws-failover/README.md`

## GitHub 업로드 전 주의

- `.env`, Discord secrets, Lost Ark API JWT, Cloudflare token, AWS key는 커밋하지 않습니다.
- `.next`, `node_modules`, `output`, `playwright-report`, `test-results`, 로그와 PID 파일은 업로드 대상에서 제외합니다.
