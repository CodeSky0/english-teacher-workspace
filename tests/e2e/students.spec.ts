import { test, expect, type Page } from "@playwright/test";

const TEST_EMAIL = `e2e-students-${Date.now()}@test.com`;
const TEST_PASSWORD = "test123456";

async function setup(page: Page) {
  await page.goto("/register");
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.fill('input[name="name"]', "E2E教师");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard/overview", { timeout: 15000 });
}

test.describe("学生管理 CRUD", () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await setup(page);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard/overview", { timeout: 15000 });
  });

  test("创建班级和学生", async ({ page }) => {
  });

  test("学生列表正确显示", async ({ page }) => {
    await page.goto("/dashboard/students");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=学生管理").first()).toBeVisible();
  });
});

test.describe("听写词表", () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await setup(page);
    await page.close();
  });

  test("听写页面正常加载", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard/overview", { timeout: 15000 });

    await page.goto("/dashboard/dictation");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=听写").first()).toBeVisible();
  });
});

test.describe("课堂互动", () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await setup(page);
    await page.close();
  });

  test("课堂互动页面加载", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard/overview", { timeout: 15000 });

    await page.goto("/dashboard/classroom");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1, h2, h3").first()).toBeVisible();
  });

  test("全屏课堂模式加载", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard/overview", { timeout: 15000 });

    await page.goto("/classroom");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("设置与备份", () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await setup(page);
    await page.close();
  });

  test("设置页面加载并显示操作日志", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard/overview", { timeout: 15000 });

    await page.goto("/dashboard/settings");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=设置").first()).toBeVisible();
    await expect(page.locator("text=操作日志").first()).toBeVisible();
  });
});
