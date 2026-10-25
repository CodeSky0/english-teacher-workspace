#!/usr/bin/env node
/**
 * 视觉回归截图脚本（桌面 1440x900 + 移动 390x844）
 *
 * 用法：
 *   node scripts/shots.mjs                # 输出到 shots/latest/
 *   node scripts/shots.mjs baseline       # 输出到 shots/baseline/
 *   pnpm shots baseline
 *
 * 前置条件：
 *   - 已经运行 pnpm dev（默认 http://localhost:3000，可用 SHOT_BASE_URL 覆盖）
 *   - 演示账号已注册且已灌种子数据（见 docs/visual/preview-env.md）
 *
 * 环境变量（可选）：
 *   SHOT_BASE_URL   默认 http://localhost:3000
 *   SHOT_EMAIL      默认 teacher@demo.local
 *   SHOT_PASSWORD   默认 demo1234
 *   SHOT_ONLY       只截指定页面，逗号分隔，例如 "overview,grades"
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE_URL = (process.env.SHOT_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const EMAIL = process.env.SHOT_EMAIL || "teacher@demo.local";
const PASSWORD = process.env.SHOT_PASSWORD || "demo1234";
const label = process.argv[2] || "latest";
const OUT_DIR = path.resolve(process.cwd(), "shots", label);
const STATE_PATH = path.resolve(process.cwd(), ".data", "shots-state.json");

const DESKTOP = { width: 1440, height: Number(process.env.SHOT_HEIGHT) || 900 };
/** SHOT_FULLPAGE=1 时截整页（注意：应用内是内层滚动容器，fullPage 只能截视口；
 *  要看长页面请用 SHOT_HEIGHT=2400 放大视口高度） */
const FULL_PAGE = process.env.SHOT_FULLPAGE === "1";
const MOBILE = { width: 390, height: 844 };

/** 桌面端要截的 17 个页面 */
const DESKTOP_PAGES = [
  { name: "login", path: "/login", auth: false },
  { name: "register", path: "/register", auth: false },
  { name: "overview", path: "/dashboard/overview", auth: true },
  { name: "semester", path: "/dashboard/semester", auth: true },
  { name: "schedule", path: "/dashboard/schedule", auth: true },
  { name: "plans", path: "/dashboard/plans", auth: true },
  { name: "research", path: "/dashboard/research", auth: true },
  { name: "students", path: "/dashboard/students", auth: true },
  { name: "homework", path: "/dashboard/homework", auth: true },
  { name: "grades", path: "/dashboard/grades", auth: true },
  { name: "classroom", path: "/dashboard/classroom", auth: true },
  { name: "vocab", path: "/dashboard/vocab", auth: true },
  { name: "dictation", path: "/dashboard/dictation", auth: true },
  { name: "resources", path: "/dashboard/resources", auth: true },
  { name: "ai", path: "/dashboard/ai", auth: true },
  { name: "settings", path: "/dashboard/settings", auth: true },
  { name: "help", path: "/dashboard/help", auth: true },
];

/** 移动端只截这两个 */
const MOBILE_PAGES = [
  { name: "overview", path: "/dashboard/overview", auth: true },
  { name: "login", path: "/login", auth: false },
];

const only = (process.env.SHOT_ONLY || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const filterPages = (pages) => (only.length ? pages.filter((p) => only.includes(p.name)) : pages);

/** 隐藏 Next.js 开发模式的浮层（dev tools 指示器 / 错误遮罩），避免污染截图 */
const HIDE_DEV_OVERLAY = "nextjs-portal { display: none !important; }";

async function preflight() {
  let res;
  try {
    res = await fetch(BASE_URL + "/api/health", { signal: AbortSignal.timeout(5000) });
  } catch (err) {
    throw new Error(
      "连不上 " + BASE_URL + "，请先在另一个终端运行 pnpm dev（PGlite 本地预览环境）。\n原因：" + (err && err.message ? err.message : err)
    );
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error("健康检查失败（HTTP " + res.status + "）：" + body.slice(0, 300));
  }
}

/**
 * 用 Better Auth 的登录接口换 cookie，写进 storageState。
 * 不依赖登录页 DOM，视觉改造后依然可用。
 */
async function loginOnce(browser) {
  const context = await browser.newContext({ viewport: DESKTOP });
  const res = await context.request.post(BASE_URL + "/api/auth/sign-in/email", {
    data: { email: EMAIL, password: PASSWORD },
    // better-auth 的 CSRF 校验需要同源 Origin/Referer
    headers: { origin: BASE_URL, referer: BASE_URL + "/login" },
  });
  if (!res.ok()) {
    const body = await res.text().catch(() => "");
    throw new Error(
      "演示账号登录失败（HTTP " + res.status() + "）：" + body.slice(0, 300) + "\n" +
        "请确认 " + EMAIL + " 已注册（见 docs/visual/preview-env.md 的「重建演示账号」）。"
    );
  }
  // 当前班级：dashboard 的若干页面依赖 workspace.currentClassId
  let classId = null;
  const classRes = await context.request.get(BASE_URL + "/api/classes");
  if (classRes.ok()) {
    const json = await classRes.json().catch(() => null);
    classId = json && json.data && json.data[0] ? json.data[0].id : null;
  }
  const state = await context.storageState({ path: STATE_PATH });
  await context.close();
  return { state, classId };
}

/** 带登录态 + 班级 cookie/localStorage 的全新上下文 */
async function newContext(browser, { auth, viewport, state, classId }) {
  const mobile = viewport.width < 500;
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
    colorScheme: "light",
    reducedMotion: "reduce",
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    storageState: auth ? state : undefined,
  });

  if (auth && classId) {
    const host = new URL(BASE_URL).hostname;
    await context.addCookies([
      { name: "classId", value: classId, domain: host, path: "/", httpOnly: false, secure: false, sameSite: "Lax" },
    ]);
    // 让 zustand persist 的 workspace.currentClassId 一开始就指向首个班级，
    // 避免首屏渲染出「未选择班级」的空态
    await context.addInitScript((id) => {
      try {
        localStorage.setItem("workspace", JSON.stringify({ state: { currentClassId: id }, version: 0 }));
      } catch {
        /* localStorage 不可用时忽略 */
      }
    }, classId);
  }

  return context;
}

/** 等页面彻底稳定：字体、网络、懒加载、动画 */
async function settle(page) {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  await page.waitForLoadState("load", { timeout: 30000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await page.evaluate(async () => {
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
  });
  // 等骨架屏/加载圈消失（LoadingState / animate-pulse）
  await page
    .waitForFunction(
      () => !document.querySelector(".animate-spin, .animate-pulse, [data-slot='skeleton']"),
      undefined,
      { timeout: 10000 }
    )
    .catch(() => {});

  // 滚动一遍触发懒加载/进入动画，再回到顶部
  await page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const scrollers = new Set();
    if (document.scrollingElement) scrollers.add(document.scrollingElement);
    document.querySelectorAll("main, .overflow-y-auto, [data-scrollable]").forEach((el) => {
      if (el.scrollHeight > el.clientHeight + 4) scrollers.add(el);
    });
    for (const el of scrollers) {
      const step = Math.max(240, Math.floor((el.clientHeight || 800) * 0.8));
      for (let y = 0; y < el.scrollHeight; y += step) {
        el.scrollTop = y;
        await wait(50);
      }
      el.scrollTop = el.scrollHeight;
      await wait(150);
      el.scrollTop = 0;
      await wait(150);
    }
  });
  await page.waitForTimeout(350);
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.addStyleTag({ content: "html, body, input, textarea { caret-color: transparent !important; }" });
}

/** 统计页面大致内容，便于判断是否是空白页 / 被重定向到 login */
async function inspect(page, expectedPath) {
  return page.evaluate((expected) => {
    const text = (document.body.innerText || "").replace(/\s+/g, " ").trim();
    return {
      url: location.pathname + location.search,
      redirected: location.pathname !== expected,
      title: document.title,
      textLength: text.length,
      textSample: text.slice(0, 160),
      canvases: document.querySelectorAll("canvas").length,
      svgs: document.querySelectorAll("svg").length,
    };
  }, expectedPath);
}

async function capture(browser, pageDef, { viewport, suffix, state, classId, results }) {
  const context = await newContext(browser, { auth: pageDef.auth, viewport, state, classId });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("pageerror", (err) => consoleErrors.push("pageerror: " + err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push("console: " + msg.text());
  });

  const file = path.join(OUT_DIR, pageDef.name + "-" + suffix + ".png");
  const url = BASE_URL + pageDef.path;
  const record = { name: pageDef.name, viewport: suffix, url, file: path.relative(process.cwd(), file) };

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.addStyleTag({ content: HIDE_DEV_OVERLAY }).catch(() => {});
    await settle(page);
    const info = await inspect(page, pageDef.path);
    await page.screenshot({ path: file, animations: "disabled", caret: "hide", fullPage: FULL_PAGE });

    record.ok = !info.redirected;
    record.finalUrl = info.url;
    record.title = info.title;
    record.textLength = info.textLength;
    record.textSample = info.textSample;
    record.canvases = info.canvases;
    record.svgs = info.svgs;
    if (info.redirected) record.warning = "被重定向到 " + info.url + "（大概率未登录）";
    if (info.textLength < 40) record.warning = (record.warning || "") + " 页面文字过少，可能是空白页";
    console.log(
      (record.ok ? "\u2713" : "\u2717") + " " + record.file +
        "  text=" + info.textLength + " svg=" + info.svgs + " canvas=" + info.canvases
    );
  } catch (err) {
    record.ok = false;
    record.error = err && err.message ? err.message : String(err);
    console.error("\u2717 " + pageDef.name + "-" + suffix + " 截图失败：" + record.error);
  } finally {
    if (consoleErrors.length) record.consoleErrors = consoleErrors.slice(0, 8);
    results.push(record);
    await context.close();
  }
}

/**
 * 启动浏览器：优先用 Playwright 自带 Chromium；
 * 若本机 Playwright 版本与已下载浏览器版本不匹配（常见于升级后未 install），
 * 自动回退到系统已安装的 Chrome，保证截图链路不会因环境问题中断。
 */
async function launchBrowser() {
  try {
    return await chromium.launch();
  } catch (err) {
    const reason = err && err.message ? err.message.split("\n")[0] : String(err);
    console.warn("⚠ 自带 Chromium 不可用，改用系统 Chrome：" + reason);
    return await chromium.launch({ channel: "chrome" });
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(path.dirname(STATE_PATH), { recursive: true });
  console.log("▶ 目标：" + BASE_URL + "  输出：" + path.relative(process.cwd(), OUT_DIR));

  await preflight();
  const browser = await launchBrowser();
  const results = [];

  try {
    const { state, classId } = await loginOnce(browser);
    console.log("✓ 登录成功：" + EMAIL + "（classId=" + (classId || "无") + "），登录态已存 " + path.relative(process.cwd(), STATE_PATH));

    for (const pageDef of filterPages(DESKTOP_PAGES)) {
      await capture(browser, pageDef, { viewport: DESKTOP, suffix: "desktop", state, classId, results });
    }
    for (const pageDef of filterPages(MOBILE_PAGES)) {
      await capture(browser, pageDef, { viewport: MOBILE, suffix: "mobile", state, classId, results });
    }
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);
  const pngCount = results.filter((r) => r.ok).length;
  const manifest = {
    label,
    baseUrl: BASE_URL,
    createdAt: new Date().toISOString(),
    desktop: DESKTOP.width + "x" + DESKTOP.height,
    mobile: MOBILE.width + "x" + MOBILE.height,
    total: results.length,
    pngCount,
    results,
  };
  await writeFile(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  console.log("\n完成：" + pngCount + "/" + results.length + " 张成功，输出目录 " + path.relative(process.cwd(), OUT_DIR));
  if (failed.length) {
    console.error("失败 " + failed.length + " 张：" + failed.map((f) => f.name + "-" + f.viewport).join(", "));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err && err.message ? err.message : err);
  process.exitCode = 1;
});