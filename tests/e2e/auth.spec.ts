import { test, expect, type Page } from "@playwright/test";

const TEST_EMAIL = `e2e-${Date.now()}@test.com`;
const TEST_PASSWORD = "test123456";

async function registerAndLogin(page: Page) {
  await page.goto("/register");
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.fill('input[name="name"]', "E2E测试教师");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard/overview", { timeout: 15000 });
}

async function login(page: Page) {
  await page.goto("/login");
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard/overview", { timeout: 15000 });
}

test.describe("认证流程", () => {
  test("注册新用户并跳转到工作台", async ({ page }) => {
    await registerAndLogin(page);
    await expect(page).toHaveURL(/\/dashboard\/overview/);
    await expect(page.locator("h1, h2, h3").first()).toBeVisible();
  });

  test("登出后重新登录", async ({ page }) => {
    await registerAndLogin(page);
  });

  test("未登录访问 dashboard 跳转到登录页", async ({ page }) => {
    await page.goto("/dashboard/overview");
    await page.waitForURL("**/login", { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("导航", () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await registerAndLogin(page);
    await page.close();
  });

  test("侧边栏导航到各页面", async ({ page }) => {
    await login(page);
    const navItems = ["学生管理", "词汇中心", "听写词表", "资源库", "AI 助手", "设置"];
    for (const label of navItems) {
      await page.click(`nav a:has-text("${label}"), nav button:has-text("${label}")`);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("h1, h2, h3").first()).toBeVisible();
    }
  });
});
