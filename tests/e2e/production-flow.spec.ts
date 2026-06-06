import { expect, test } from "playwright/test";

test("leader can create and operate a raid group", async ({ page }) => {
  const stamp = Date.now();
  const email = `leader-${stamp}@example.com`;
  const password = "password123!";
  const groupName = `배포검증공대-${stamp}`;
  const nickname = `리더-${stamp}`;
  const characterName = `검증슬레-${stamp}`;
  const templateName = `상아탑-${stamp}`;
  const scheduleTitle = `상아탑 일정-${stamp}`;

  await page.goto("/");
  await page
    .getByRole("main")
    .getByRole("link", { name: "회원가입" })
    .click();
  await page.getByPlaceholder("이메일").fill(email);
  await page.getByPlaceholder("비밀번호").fill(password);
  await page.getByPlaceholder("이름").fill("배포 검증");
  await page.getByRole("button", { name: "계정 만들기" }).click();
  await expect(page.getByRole("heading", { name: "새 공대 만들기" })).toBeVisible();

  await page.getByPlaceholder("공대 이름").fill(groupName);
  await page.getByPlaceholder("내 닉네임").fill(nickname);
  await page.getByRole("button", { name: "공대 생성" }).click();
  await expect(page.getByRole("heading", { name: "공대 설정" })).toBeVisible();
  await expect(page.getByText(groupName)).toBeVisible();
  await expect(page.getByText(/\/invite\//)).toBeVisible();

  await page.getByRole("button", { name: "로그아웃" }).click();
  await page.getByRole("main").getByRole("link", { name: "로그인" }).click();
  await page.getByPlaceholder("이메일").fill(email);
  await page.getByPlaceholder("비밀번호").fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page.getByRole("heading", { name: "대시보드" })).toBeVisible();
  await expect(page.getByText(new RegExp(`${groupName}의 일정`))).toBeVisible();

  await page.getByRole("link", { name: "공대원" }).click();
  await page.getByPlaceholder("캐릭터명").fill(characterName);
  await page.getByPlaceholder("직업").fill("슬레이어");
  await page.getByPlaceholder("아이템 레벨").fill("1640");
  await page.getByPlaceholder("메모").fill("배포 검증");
  await page.getByRole("button", { name: "캐릭터 추가" }).click();
  await expect(page.getByText(characterName)).toBeVisible();

  await page.getByRole("link", { name: "가능 시간" }).click();
  await page.getByRole("button", { name: "가능" }).click();
  const saveAvailability = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("/calendar") &&
      response.status() < 400,
  );
  await page.getByRole("button", { name: /20:00 미입력/ }).first().click();
  await saveAvailability;
  await expect(
    page.getByRole("button", { name: /20:00 가능/ }).first(),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "공대 가능 시간 현황" }),
  ).toBeVisible();
  await expect(page.getByText("가능 1").first()).toBeVisible();

  await page.getByRole("link", { name: "템플릿" }).click();
  await page.getByPlaceholder("레이드 이름").fill(templateName);
  await page.getByPlaceholder("난이도").fill("하드");
  await page.getByPlaceholder("관문").fill("1-4");
  await page.getByPlaceholder("필요 인원").fill("1");
  await page.getByPlaceholder("딜러 자리 수").fill("1");
  await page.getByPlaceholder("서폿 자리 수").fill("0");
  await page.getByRole("button", { name: "템플릿 생성" }).click();
  await expect(page.getByText(templateName)).toBeVisible();

  await page.getByRole("link", { name: "일정" }).click();
  await page.getByPlaceholder("일정 제목").fill(scheduleTitle);
  await page
    .getByPlaceholder("2026-06-05T21:00:00+09:00")
    .fill("2026-06-06T21:00:00+09:00");
  await page
    .getByRole("combobox")
    .selectOption({ label: `${templateName} · 하드 · 1-4관문` });
  await page.getByRole("button", { name: "일정 생성" }).click();
  await page.getByRole("link", { name: new RegExp(scheduleTitle) }).click();
  await expect(page.getByRole("heading", { name: scheduleTitle })).toBeVisible();

  await expect(page.getByRole("heading", { name: "일정 참석 체크" })).toBeVisible();
  await expect(page.getByText("내 상태: 미체크")).toBeVisible();
  await page
    .getByPlaceholder("메모 예: 10분 전 접속, 조금 늦을 수 있음")
    .fill("참석 가능");
  await page.getByRole("button", { name: "참석" }).click();
  await expect(page.getByText("내 상태: 참석")).toBeVisible();
  await expect(page.getByText("참석 가능", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "내 캐릭터 배정" }).click();
  await expect(page.getByText(`${nickname} / ${characterName}`)).toBeVisible();
});
