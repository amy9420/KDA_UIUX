import { test, expect } from "@playwright/test";

async function prepare(page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "서류 준비 시작하기", exact: true })
    .click();
  await page.getByRole("button", { name: "맞춤 준비 서류 보기" }).click();
  await page
    .getByRole("button", { name: "서류 준비하기", exact: true })
    .click();
  const fetch = page.getByRole("button", {
    name: "서류 불러오기",
    exact: true,
  });
  await expect(fetch).toBeDisabled();
  await page
    .getByRole("checkbox", { name: "자료 조회와 이용에 동의합니다" })
    .check();
  await fetch.click();
  await page.getByRole("button", { name: "임대차계약서 등록하기" }).click();
  await expect(
    page.getByRole("button", { name: "서류 점검하기", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "파일 선택", exact: true }).click();
  await page.getByRole("button", { name: /임대차계약서.pdf/ }).click();
  await page
    .getByRole("button", { name: "서류 점검하기", exact: true })
    .click();
  await page.getByRole("button", { name: "보완 서류 확인" }).click();
}

async function chooseCorrected(page) {
  await page.getByRole("button", { name: "파일 교체", exact: true }).click();
  await page
    .getByRole("button", { name: "임대차계약서_보완.pdf", exact: true })
    .click();
  await page
    .getByRole("button", { name: "보완 서류 점검하기", exact: true })
    .click();
}

test("보완 재점검과 필수 동의 후 제출 내역까지 이동한다", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await prepare(page);
  await chooseCorrected(page);
  await page.getByRole("button", { name: "제출 내용 확인하기" }).click();
  const submit = page.getByRole("button", { name: "담당자에게 제출하기" });
  await expect(submit).toBeDisabled();
  await page.getByRole("checkbox", { name: /서류와 점검 결과를/ }).check();
  await submit.click();
  await expect(
    page.getByRole("heading", { name: "서류가 전달되었어요" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "나의 신청 확인" }).click();
  await expect(page.getByText(/접수번호　DEMO-/)).toBeVisible();
  await page.getByRole("button", { name: "제출 내역 보기" }).click();
  await expect(
    page.getByRole("heading", { name: "신청 세부 내역" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("직원 확인 요청과 취소, 키보드 팝업 조작이 작동한다", async ({ page }) => {
  await prepare(page);
  await page
    .getByRole("button", { name: "직원에게 확인 요청", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "직원에게 확인 요청", exact: true })
    .click();
  await page
    .getByRole("button", { name: "확인 요청하기", exact: true })
    .click();
  await page.getByRole("button", { name: "제출 내용 확인하기" }).click();
  await expect(page.locator(".review-status")).toContainText(
    "통과 2건 · 직원 확인 2건",
  );
});

test("실제 이미지 파일 등록, 잘못된 형식 거절, 삭제 후 점검 비활성화", async ({
  page,
}) => {
  await page.goto("/#upload");
  await page.getByLabel("서류 파일", { exact: true }).setInputFiles({
    name: "invalid.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("sample"),
  });
  await expect(page.getByRole("alert")).toContainText("PDF, PNG, JPG, WEBP");
  await page.getByLabel("서류 파일", { exact: true }).setInputFiles({
    name: "contract.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(page.getByText("contract.png", { exact: true })).toBeVisible();
  await expect(page.locator(".uploaded-image")).toBeVisible();
  await page.getByRole("button", { name: "삭제", exact: true }).click();
  await page.getByRole("button", { name: "삭제하기", exact: true }).click();
  await expect(page.getByText("아직 등록한 서류가 없어요.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "서류 점검하기", exact: true }),
  ).toBeDisabled();
});

test("모바일 화면이 가로로 넘치지 않고 헤더를 유지하며 스크롤한다", async ({
  page,
}) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const before = await page.locator(".app-header").boundingBox();
    await page.locator("main").evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    const after = await page.locator(".app-header").boundingBox();
    expect(after.y).toBe(before.y);
    expect(
      await page
        .locator("main")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
  }
});

test("챗봇 순차 등장, 질문 전송, 첨부 취소와 음성 체험", async ({ page }) => {
  await page.goto("/#chat");
  await expect(page.locator(".conditions")).toHaveCount(0);
  await expect(page.locator(".conditions")).toBeVisible();
  await page
    .getByRole("button", { name: "공동대표인 경우 필요한 서류는?" })
    .click();
  await expect(page.locator(".extra-message .user-message")).toHaveText(
    "공동대표인 경우 필요한 서류는?",
  );
  await expect(page.locator(".extra-message .bubble")).toContainText(
    "추가 서류",
  );
  await page.getByRole("button", { name: "서류 첨부", exact: true }).click();
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await expect(page.locator("[data-screen=chat]")).toBeVisible();
  await page.getByRole("button", { name: "서류 첨부", exact: true }).click();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(page.locator("[data-screen=chat]")).toBeVisible();
  await page.getByRole("button", { name: "음성 입력", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "실제 마이크는 사용하지 않아요",
  );
  await page.getByRole("button", { name: "이 내용 보내기" }).click();
  await expect(
    page.locator(".extra-message .user-message").last(),
  ).toContainText("개인사업자이고");
});

test("조회 화면은 준비 서류로 복귀하고 주요 화면의 마지막 버튼이 한 화면에 들어간다", async ({
  page,
}) => {
  async function fits(selector) {
    const main = await page.locator("main").boundingBox();
    const box = await page.locator(selector).boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(main.y + main.height + 1);
  }
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await fits(".intro .chat-link");
  await page
    .getByRole("button", { name: "서류 준비 시작하기", exact: true })
    .click();
  await page.getByRole("button", { name: "맞춤 준비 서류 보기" }).click();
  await page.locator(".document-meta .text-link").first().click();
  await expect(page.locator('[data-screen="auto-consent"]')).toBeVisible();
  await page.getByRole("button", { name: "뒤로가기" }).click();
  await expect(page.locator('[data-screen="documents"]')).toBeVisible();
  await page.locator(".document-meta .text-link").first().click();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(page.locator('[data-screen="documents"]')).toBeVisible();
  await prepare(page);
  await chooseCorrected(page);
  await page.getByRole("button", { name: "제출 내용 확인하기" }).click();
  await expect(page.locator("[data-screen=review]")).toBeVisible();
  await page.getByRole("checkbox", { name: /서류와 점검 결과를/ }).check();
  await page.getByRole("button", { name: "담당자에게 제출하기" }).click();
  await expect(page.locator("[data-screen=complete]")).toBeVisible();
  await fits(".complete-page .chat-link");
});

test("챗봇 재시작 시 초기화하고 재점검·제출 화면은 좌우 중앙 정렬을 유지한다", async ({
  page,
}) => {
  await page.goto("/#chat");
  await page
    .getByRole("button", { name: "공동대표인 경우 필요한 서류는?" })
    .click();
  await expect(page.locator(".extra-message")).toHaveCount(1);
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page
    .getByRole("button", { name: "서류 준비 시작하기", exact: true })
    .click();
  await expect(page.locator(".extra-message")).toHaveCount(0);
  await expect(page.locator(".conditions")).toHaveCount(0);
  await expect(page.locator(".conditions")).toBeVisible();
  await prepare(page);
  await chooseCorrected(page);
  await expect(page.locator("[data-screen=rechecked]")).toBeVisible();
  await expect(page.locator(".summary .zero")).toContainText("보완 필요0건");
  await expect(page.locator(".summary .issue")).toHaveCount(0);
  async function centered(selector) {
    const shell = await page.locator(".app-shell").boundingBox();
    const el = await page.locator(selector).boundingBox();
    expect(
      Math.abs(el.x + el.width / 2 - shell.x - shell.width / 2),
    ).toBeLessThan(1);
  }
  await centered(".summary");
  await centered(".result-card:first-of-type");
  await page.getByRole("button", { name: "제출 내용 확인하기" }).click();
  await expect(page.locator("[data-screen=review]")).toBeVisible();
  await centered(".review-status");
  await centered(".accordion:first-of-type");
  const consent = page.locator(".review-page .checkbox span");
  await expect(consent).toHaveText(
    "(필수) 서류와 점검 결과를 담당자에게 전달하는 데 동의합니다.",
  );
  const rect = await consent.boundingBox(),
    main = await page.locator("main").boundingBox();
  expect(rect.x + rect.width).toBeLessThanOrEqual(main.x + main.width - 19);
});

test("선택 파일별 결과와 교체·삭제·뒤로가기가 일치한다", async ({ page }) => {
  await prepare(page);
  await page
    .getByRole("button", { name: "다시 점검하기", exact: true })
    .click();
  await expect(page.locator("[data-screen=results]")).toBeVisible();
  await expect(page.locator(".summary .issue")).toContainText("보완 필요1건");
  await page
    .getByRole("button", { name: "보완 서류 확인", exact: true })
    .click();
  await chooseCorrected(page);
  await expect(page.locator("[data-screen=rechecked]")).toBeVisible();
  await expect(page.locator(".summary .zero")).toContainText("보완 필요0건");
  await expect(page.locator(".result-card.passed")).toHaveCount(3);
  await page.getByRole("button", { name: "뒤로가기", exact: true }).click();
  await expect(page.locator(".file-heading")).toContainText(
    "임대차계약서_보완.pdf",
  );
  await page.getByRole("button", { name: "교체", exact: true }).click();
  await page
    .getByRole("button", { name: "임대차계약서.pdf", exact: true })
    .click();
  await page.getByRole("button", { name: /^(보완 )?서류 점검하기$/ }).click();
  await expect(page.locator("[data-screen=results]")).toBeVisible();
  await expect(page.locator(".result-card.needs-fix")).toContainText(
    "임대차계약서",
  );
  await expect(page.locator(".summary .issue")).toContainText("보완 필요1건");
  await page.getByRole("button", { name: "뒤로가기", exact: true }).click();
  await expect(page.locator(".file-heading")).toContainText("임대차계약서.pdf");
  await page.getByRole("button", { name: "삭제", exact: true }).click();
  await page.getByRole("button", { name: "삭제하기", exact: true }).click();
  await expect(page.getByText("아직 등록한 서류가 없어요.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^(보완 )?서류 점검하기$/ }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "파일 선택", exact: true }).click();
  await page
    .getByRole("button", { name: "임대차계약서_보완.pdf", exact: true })
    .click();
  await page.getByRole("button", { name: /^(보완 )?서류 점검하기$/ }).click();
  await expect(page.locator("[data-screen=rechecked]")).toBeVisible();
});
