# Role-Based Dashboard Design

## Goal

Make the app feel like a weekly raid operations console for both 공대장 and
공대원. The redesign should not change data ownership, authentication, or raid
business logic. It should make the existing MVP easier to scan and act on.

## Scope

- Home page before login: explain the product through 공대장 업무 and 공대원 업무.
- Home page after login: show a role-based task board backed by the current
  dashboard summary data.
- App shell: group authenticated navigation by 공대장 업무 and 공대원 업무, with
  templates, notifications, settings, admin, and guides in the menu.
- Global visual polish: keep the quiet operational palette and remove decorative
  background emphasis.

## Information Architecture

공대장 업무:

- 주간 일정
- 공대 편성
- 가능 시간 확인
- 알림 실패 처리

공대원 업무:

- 레이드 신청
- 숙제 현황
- 내 가능 시간 입력
- 공대원/캐릭터 확인

## Visual System

Use compact section panels, list rows, and status badges instead of large
marketing cards. The palette stays mostly neutral with teal for primary action,
amber for coordination needed, emerald for complete/safe, and rose for failed
states.

## Verification

- Unit/component tests for changed home and app shell copy.
- Lint, TypeScript, build, and relevant test suites.
- Browser smoke QA on desktop and mobile viewports to verify no overlapping
  Korean text and that role sections are visible in the first screen.

