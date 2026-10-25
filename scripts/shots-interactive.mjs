#!/usr/bin/env node
/**
 * 交互态截图脚本——补充 shots.mjs（只截静态页）覆盖不到的交互场景。
 *
 * 用法：
 *   node scripts/shots-interactive.mjs            # 输出到 shots/interactive/
 *   pnpm shots:interactive
 *
 * 前置条件：
 *   - 已运行 pnpm dev（默认 http://localhost:3000，可用 SHOT_BASE_URL 覆盖）
 *   - 演示账号已注册且已灌种子数据（见 docs/visual/preview-env.md）
 *
 * 环境变量（可选）：
 *   SHOT_BASE_URL   默认 http://localhost:3000
 *   SHOT_EMAIL      默认 teacher@demo.local
 *   SHOT_PASSWORD   默认 demo1234
 */
import { chromium } from "@playwright/test";
import path from "node:path";
import { mkdir } from "node:fs/promises";

const BASE = (process.env.SHOT_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const EMAIL = process.env.SHOT_EMAIL || "teacher@demo.local";
const PASSWORD = process.env.SHOT_PASSWORD || "demo1234";
const HOST = new URL(BASE).hostname;
const OUT = path.resolve("shots", "interactive");
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
const loginCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const res = await loginCtx.request.post(BASE + "/api/auth/sign-in/email", {
  data: { email: EMAIL, password: PASSWORD },
  headers: { origin: BASE, referer: BASE + "/login" },
});
if (!res.ok()) throw new Error("login failed " + res.status() + " " + (await res.text()));
const state = await loginCtx.storageState();
const classRes = await loginCtx.request.get(BASE + "/api/classes");
const classJson = await classRes.json();
const classId = classJson.data?.[0]?.id;
console.log("classId", classId);

// poll: reuse or create
const pollsRes = await loginCtx.request.get(BASE + "/api/classroom/polls?classId=" + classId);
const pollsJson = await pollsRes.json();
let poll = (pollsJson.data ?? []).find((p) => p.classId === classId);
if (!poll) {
  const created = await loginCtx.request.post(BASE + "/api/classroom/polls", {
    data: { classId, question: "这节课你最大的收获是什么？", type: "single_choice", isActive: true },
  });
  const cj = await created.json();
  poll = cj.data;
  for (const label of ["听懂了核心句型", "记住了新单词", "敢开口表达了", "还需要再练一次"]) {
    await loginCtx.request.post(BASE + "/api/classroom/poll-options", { data: { pollId: poll.id, label } });
  }
}
console.log("poll", poll?.id);
await loginCtx.close();

async function newCtx(viewport) {
  const mobile = viewport.width < 500;
  const context = await browser.newContext({
    viewport, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile,
    colorScheme: "light", reducedMotion: "reduce", locale: "zh-CN", timezoneId: "Asia/Shanghai",
    storageState: state,
  });
  await context.addCookies([{ name: "classId", value: classId, domain: HOST, path: "/", httpOnly: false, secure: false, sameSite: "Lax" }]);
  await context.addInitScript((id) => {
    try { localStorage.setItem("workspace", JSON.stringify({ state: { currentClassId: id }, version: 0 })); } catch {}
  }, classId);
  return context;
}

async function settle(page) {
  await page.waitForLoadState("load", { timeout: 30000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await page.evaluate(async () => { try { await document.fonts.ready; } catch {} });
  await page.waitForTimeout(900);
}

async function shot(name, url, viewport, prep) {
  const context = await newCtx(viewport);
  const page = await context.newPage();
  page.on("pageerror", (e) => console.error("pageerror", name, e.message));
  await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await settle(page);
  if (prep) await prep(page);
  await page.waitForTimeout(600);
  const file = path.join(OUT, name + ".png");
  await page.screenshot({ path: file, animations: "disabled", caret: "hide" });
  console.log("shot", file);
  await context.close();
}

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

await shot("bigscreen-home-desktop", "/classroom", DESKTOP);
await shot("bigscreen-rollcall-desktop", "/classroom", DESKTOP, async (page) => {
  await page.getByRole("button", { name: /随机点名/ }).click();
  await page.waitForTimeout(1400);
});
await shot("bigscreen-points-desktop", "/classroom", DESKTOP, async (page) => {
  await page.getByRole("button", { name: /小组积分/ }).click();
  await page.waitForTimeout(500);
});
await shot("classroom-points-desktop", "/dashboard/classroom", DESKTOP, async (page) => {
  await page.getByRole("button", { name: /课堂积分/ }).click();
  await page.waitForTimeout(800);
});
await shot("classroom-attendance-desktop", "/dashboard/classroom", DESKTOP, async (page) => {
  await page.getByRole("button", { name: /^考勤/ }).click();
  await page.waitForTimeout(900);
});
await shot("classroom-feedback-desktop", "/dashboard/classroom", DESKTOP, async (page) => {
  await page.getByRole("button", { name: /表现反馈/ }).click();
  await page.waitForTimeout(900);
});
if (poll?.id) {
  await shot("poll-mobile", "/poll/" + poll.id, MOBILE);
  await shot("poll-mobile-voted", "/poll/" + poll.id, MOBILE, async (page) => {
    await page.getByRole("button", { name: /听懂了核心句型/ }).click();
    await page.waitForTimeout(2600);
  });
  await shot("poll-desktop", "/poll/" + poll.id, DESKTOP);
}
await shot("classroom-poll-desktop", "/dashboard/classroom", DESKTOP, async (page) => {
  await page.evaluate(() => {
    const el = document.scrollingElement || document.documentElement;
    el.scrollTop = el.scrollHeight;
  });
  await page.waitForTimeout(1000);
});
await shot("bigscreen-rollcall-active", "/classroom", DESKTOP, async (page) => {
  await page.getByRole("button", { name: /随机点名/ }).click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /唤醒星核/ }).click();
  await page.waitForTimeout(1800);
});

await browser.close();
console.log("done");
