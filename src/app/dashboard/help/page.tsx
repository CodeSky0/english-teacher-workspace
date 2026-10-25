"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Compass, Monitor, Palette, CloudUpload, ShieldCheck, Wrench, FileSpreadsheet,
  ArrowRight, Users, CalendarDays, BookOpen, BarChart3, Settings, Search, X, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { text: string; swatch?: string };
type Group = "入门" | "课堂" | "数据" | "安全" | "排障" | "导入";

const sections: { slug: string; en: string; title: string; group: Group; icon: typeof Compass; items: Item[] }[] = [
  {
    slug: "start",
    en: "Getting Started",
    title: "如何使用英语教师工作台",
    group: "入门",
    icon: Compass,
    items: [
      { text: "注册账户并登录后，左侧导航栏提供 13 个功能模块。" },
      { text: "首先在「学生管理」中创建班级和导入学生名单。" },
      { text: "然后在「教学课表」中设置每周课表。" },
      { text: "在「备课与反思」中编写备课记录，在「作业与练习」中发布作业。" },
      { text: "在「学情分析」中录入考试成绩，系统会自动计算总分和生成统计图表。" },
      { text: "所有数据自动保存到服务器端的 PostgreSQL 数据库，无需手动点击保存按钮。" },
    ],
  },
  {
    slug: "classroom",
    en: "Classroom Mode",
    title: "课堂互动操作说明",
    group: "课堂",
    icon: Monitor,
    items: [
      { text: "按快捷键 C 或点击顶栏「课堂互动」按钮进入课堂模式。" },
      { text: "按 Esc 键退出课堂模式。" },
      { text: "课堂模式提供 8 个工具：随机点名、小组积分、课堂计时器、学生评价标签、课堂投票、座位考勤、单词卡、听写训练。" },
      { text: "随机点名支持空格键抽取下一位，支持排除缺勤学生。" },
      { text: "小组积分可创建小组并实时加减积分，积分数据自动保存。" },
      { text: "计时器支持正计时和倒计时，倒计时到时有提示音。" },
    ],
  },
  {
    slug: "colors",
    en: "Subject Colors",
    title: "课表颜色规则",
    group: "课堂",
    icon: Palette,
    items: [
      { text: "听力 / 听写", swatch: "listen" },
      { text: "语法 / 句型", swatch: "grammar" },
      { text: "阅读 / 读", swatch: "read" },
      { text: "写作 / 写 / 作文", swatch: "write" },
      { text: "词汇 / 单词 / 默写", swatch: "vocab" },
      { text: "口语 / 说 / 朗读 / 演讲", swatch: "speak" },
      { text: "习题 / 练习 / 复习 / 考试 / 测试 / 讲评", swatch: "exam" },
      { text: "作业", swatch: "homework" },
      { text: "其他", swatch: "other" },
    ],
  },
  {
    slug: "sync",
    en: "Sync & Devices",
    title: "如何更换电脑及同步数据",
    group: "数据",
    icon: CloudUpload,
    items: [
      { text: "本系统的所有数据保存在服务器端的 PostgreSQL 数据库中。" },
      { text: "更换电脑后，只需登录同一账户即可访问服务器中的全部数据。" },
      { text: "无需手动迁移文件，数据会自动从服务器同步到新设备。" },
      { text: "建议定期导出 JSON 备份到本地，作为额外的数据安全保障。" },
    ],
  },
  {
    slug: "security",
    en: "Security",
    title: "数据安全与备份",
    group: "安全",
    icon: ShieldCheck,
    items: [
      { text: "所有数据通过 HTTPS 加密传输。" },
      { text: "不同教师账户的数据完全隔离，互不可见。" },
      { text: "密码使用安全哈希存储，不会明文保存。" },
      { text: "删除操作采用软删除，可在回收站中恢复。" },
      { text: "在「设置」中可导出全量 JSON 备份，也可通过 JSON 文件恢复数据。" },
      { text: "恢复数据时使用数据库事务，失败会自动回滚。" },
    ],
  },
  {
    slug: "troubleshoot",
    en: "Troubleshooting",
    title: "故障排查",
    group: "排障",
    icon: Wrench,
    items: [
      { text: "无法登录：检查邮箱和密码是否正确，确认网络连接正常。" },
      { text: "数据不显示：刷新页面，检查网络连接，确认已登录正确账户。" },
      { text: "保存失败：检查网络连接，系统会显示「保存失败，点击重试」提示。" },
      { text: "页面白屏：清除浏览器缓存，重新登录。" },
      { text: "课堂数据丢失：检查是否登录了正确账户，联系管理员查看服务器状态。" },
    ],
  },
  {
    slug: "csv",
    en: "CSV Guide",
    title: "Excel / CSV 导入导出指南",
    group: "导入",
    icon: FileSpreadsheet,
    items: [
      { text: "支持 9 个核心模块的 CSV 导入导出：学生、课表、备课、教研、作业、成绩、词汇、听写、资源。" },
      { text: "CSV 文件使用 UTF-8 编码（带 BOM），支持中文表头。" },
      { text: "导入时支持「追加导入」和「清空当前范围后导入」两种模式。" },
      { text: "导入前会预览数据和验证，确认无误后才执行写入。" },
      { text: "成绩导入时，如果提供了总分列，则使用填写值并标记为手动总分；否则自动计算听力+口语+笔试。" },
      { text: "词汇导入按单元名称归并，同一单元的单词会合并到一个单元中。" },
      { text: "可在各模块页面点击「导入 CSV」和「导出 CSV」按钮操作。" },
    ],
  },
];

const GROUPS: Group[] = ["入门", "课堂", "数据", "安全", "排障", "导入"];

const quickLinks = [
  { href: "/dashboard/students", label: "学生管理", en: "Students", icon: Users, tone: "#3d6896" },
  { href: "/dashboard/schedule", label: "教学课表", en: "Schedule", icon: CalendarDays, tone: "#8a6230" },
  { href: "/dashboard/plans", label: "备课与反思", en: "Lesson Plans", icon: BookOpen, tone: "#4a8f74" },
  { href: "/dashboard/grades", label: "学情分析", en: "Analytics", icon: BarChart3, tone: "#b8556a" },
  { href: "/classroom", label: "课堂互动", en: "Classroom", icon: Monitor, tone: "#3d6896" },
  { href: "/dashboard/settings", label: "设置与备份", en: "Settings", icon: Settings, tone: "#8a6230" },
];

const SWATCH_TEXT: Record<string, string> = {
  listen: "text-c-listen", grammar: "text-c-grammar", read: "text-c-read", write: "text-c-write",
  vocab: "text-c-vocab", speak: "text-c-speak", exam: "text-c-exam", homework: "text-c-homework", other: "text-c-other",
};
const SWATCH_BG: Record<string, string> = {
  listen: "bg-c-listen-bg", grammar: "bg-c-grammar-bg", read: "bg-c-read-bg", write: "bg-c-write-bg",
  vocab: "bg-c-vocab-bg", speak: "bg-c-speak-bg", exam: "bg-c-exam-bg", homework: "bg-c-homework-bg", other: "bg-c-other-bg",
};

export default function HelpPage() {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<Group | "全部">("全部");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sections.filter((s) => {
      if (group !== "全部" && s.group !== group) return false;
      if (!q) return true;
      const haystack = [s.title, s.en, s.group, ...s.items.map((i) => i.text)].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [query, group]);

  return (
    <div>
      {/* ══════════ 深色搜索 / 分类条 ══════════ */}
      <section className="spotlight relative mb-4 overflow-hidden rounded-[26px] shadow-[0_2px_4px_rgba(36,35,31,0.06),0_28px_60px_-30px_rgba(58,42,45,0.55)] animate-fade-in-up">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,#3d2630_0%,#5a3542_20%,#7d4d55_40%,#6b5a72_60%,#3f5878_82%,#2d4761_100%)]" />
        <div className="pointer-events-none absolute -left-20 -top-28 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(255,170,150,0.32),transparent_64%)]" />
        <div className="pointer-events-none absolute -right-20 -top-28 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,rgba(126,172,255,0.28),transparent_66%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.09] grid-veil" />
        <svg
          className="pointer-events-none absolute -right-10 top-1/2 hidden h-[16rem] w-[16rem] -translate-y-1/2 text-white/15 lg:block animate-drift"
          viewBox="0 0 200 200"
          fill="none"
          aria-hidden
        >
          <circle cx="100" cy="100" r="92" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="100" cy="100" r="72" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 6" />
          <circle cx="100" cy="100" r="52" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="100" cy="100" r="30" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 5" />
        </svg>
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-7 right-3 hidden select-none font-display text-[7.5rem] font-semibold leading-none tracking-tight text-white/[0.07] lg:block"
        >
          Handbook
        </span>

        <div className="relative p-6 sm:p-7">
          <div className="flex flex-wrap items-center gap-3">
            <span className="eyebrow text-white/55">Handbook</span>
            <span className="h-3 w-px bg-white/25" />
            <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] text-white/85 backdrop-blur-sm">
              <Sparkles className="h-3 w-3" />
              {sections.length} 个主题 · 约 10 分钟读完
            </span>
          </div>
          <h2 className="mt-2.5 font-serif text-[30px] font-semibold leading-[1.16] tracking-tight text-white sm:text-[36px]">
            帮助与使用手册
          </h2>
          <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-white/70">
            搜索关键词，或按分类直达说明。从「学生管理 → 课表 → 备课」开始即可跑通整套流程。
          </p>

          <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索：点名、备份、CSV、考勤…"
                aria-label="搜索帮助内容"
                className="h-11 w-full rounded-xl border border-white/20 bg-white/[0.10] pl-10 pr-10 text-sm text-white placeholder:text-white/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)] backdrop-blur-sm transition-all duration-[var(--dur-quick)] hover:border-white/30 focus-visible:border-white/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              />
              {query && (
                <button
                  type="button"
                  aria-label="清空搜索"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {(["全部", ...GROUPS] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGroup(g)}
                  aria-pressed={group === g}
                  className={cn(
                    "min-h-[36px] rounded-full px-3 text-[12px] transition-all duration-[var(--dur-quick)]",
                    group === g
                      ? "bg-white font-medium text-[#4a2231] shadow-[0_4px_12px_-6px_rgba(0,0,0,0.6)]"
                      : "border border-white/18 bg-white/[0.06] text-white/70 hover:border-white/35 hover:bg-white/[0.12] hover:text-white"
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        {/* ══════════ 左栏：目录 + 快速入口（sticky） ══════════ */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-3">
            <div className="overflow-hidden rounded-2xl edge-lit bg-[linear-gradient(170deg,rgba(255,255,255,0.72),rgba(250,248,244,0.52))] p-3 shadow-[0_1px_2px_rgba(36,35,31,0.04),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-md">
              <div className="flex items-center justify-between px-1.5 pb-2">
                <p className="eyebrow">Contents</p>
                <span className="font-display text-[10px] tabular-nums text-neutral-5">{filtered.length} / {sections.length}</span>
              </div>
              <nav className="space-y-0.5">
                {filtered.map((s, i) => (
                  <a
                    key={s.slug}
                    href={`#${s.slug}`}
                    className="group flex items-center gap-2 rounded-lg px-1.5 py-1.5 transition-all duration-[var(--dur-quick)] hover:bg-white/70"
                  >
                    <span className="flex h-5 w-6 shrink-0 items-center justify-center rounded-md bg-[linear-gradient(180deg,#f2f1ed,#eae8e2)] font-display text-[10px] font-semibold tabular-nums text-neutral-6 ring-1 ring-inset ring-line/60 transition-colors group-hover:bg-[linear-gradient(180deg,#f8e4e7,#f2d6da)] group-hover:text-primary-d">
                      {String(sections.indexOf(s) + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12px] text-neutral-7 transition-colors group-hover:text-text">{s.title}</span>
                    <ArrowRight className="h-3 w-3 shrink-0 -translate-x-1 text-neutral-4 opacity-0 transition-all duration-[var(--dur-quick)] group-hover:translate-x-0 group-hover:opacity-60" />
                  </a>
                ))}
                {filtered.length === 0 && <p className="px-1.5 py-2 text-[11px] text-muted">没有匹配的条目</p>}
              </nav>
              <p className="mt-2 border-t border-line/60 px-1.5 pt-2 text-[10px] leading-relaxed text-neutral-5">
                共 {sections.length} 个主题 · 点击直达
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl edge-lit bg-[linear-gradient(170deg,rgba(255,255,255,0.7),rgba(250,248,244,0.5))] p-3 shadow-[0_1px_2px_rgba(36,35,31,0.04),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-md">
              <p className="eyebrow px-1.5 pb-2">Quick Links</p>
              <nav className="space-y-0.5">
                {quickLinks.map((l) => {
                  const Icon = l.icon;
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="group flex items-center gap-2 rounded-lg px-1.5 py-1.5 transition-all duration-[var(--dur-quick)] hover:bg-white/70"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/80 ring-1 ring-inset ring-line/60 transition-transform group-hover:scale-105" style={{ color: l.tone }}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12px] text-neutral-7 transition-colors group-hover:text-text">{l.label}</span>
                      <ArrowRight className="h-3 w-3 shrink-0 -translate-x-1 text-neutral-4 opacity-0 transition-all duration-[var(--dur-quick)] group-hover:translate-x-0 group-hover:opacity-60" />
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </aside>

        {/* ══════════ 分区卡片 ══════════ */}
        <div>
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="relative mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-b from-[#f8e4e7] to-[#f2d6da] text-[#a64953] ring-1 ring-inset ring-[#c56473]/20">
                  <Search className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-text">没有找到「{query || group}」相关内容</p>
                <p className="mt-1 text-xs text-muted">试试更短的关键词，或切换到「全部」分类</p>
                <button
                  type="button"
                  onClick={() => { setQuery(""); setGroup("全部"); }}
                  className="mt-4 rounded-lg border border-line bg-gradient-to-b from-white to-[#faf9f7] px-3 py-1.5 text-xs text-primary-d shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all hover:-translate-y-[1px] hover:border-primary/40"
                >
                  重置筛选
                </button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filtered.map((s) => {
                const Icon = s.icon;
                const index = sections.indexOf(s) + 1;
                return (
                  <Card key={s.slug} id={s.slug} className="reveal scroll-mt-24 self-start">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="eyebrow truncate">{s.en}</span>
                          <span className="rounded-full bg-white/75 px-1.5 py-[1px] text-[9px] text-neutral-6 ring-1 ring-inset ring-line/70">{s.group}</span>
                        </div>
                        <span className="font-display text-[11px] tabular-nums text-neutral-4">{String(index).padStart(2, "0")}</span>
                      </div>
                      <CardTitle className="mt-1.5 flex items-start gap-2.5 text-[15px]">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-[#f8e4e7] to-[#f2d6da] text-primary-d ring-1 ring-inset ring-[#c56473]/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 pt-0.5 leading-snug tracking-[0.01em]">{s.title}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {s.items.map((it, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-[13px] leading-[1.7] text-neutral-7">
                            {it.swatch ? (
                              <span className={`mt-[3px] inline-flex shrink-0 items-center rounded-md px-2 py-[1px] text-[11px] font-medium ring-1 ring-inset ring-black/[0.06] ${SWATCH_BG[it.swatch]} ${SWATCH_TEXT[it.swatch]}`}>
                                {it.text}
                              </span>
                            ) : (
                              <>
                                <span className="mt-[7px] h-1 w-1 shrink-0 rotate-45 rounded-[1px] bg-[#c56473]/55" />
                                <span>{it.text}</span>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted">
            <Compass className="h-3 w-3" />
            找不到答案？在「设置」中导出日志并联系管理员。
          </p>
        </div>
      </div>
    </div>
  );
}
