import { memo } from "react";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { Sparkline } from "@/components/charts/sparkline";
import { ProgressRing } from "@/components/charts/progress-ring";
import { CountUp } from "@/components/common/count-up";
import {
  LayoutDashboard, CalendarDays, Users, GraduationCap, Headphones,
  BookOpen, AlertTriangle, TrendingUp, ArrowRight, Sparkles, CheckCircle2, type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { subjectStyle } from "@/lib/subject-style";

export type Overview = {
  totals: {
    classes: number;
    students: number;
    vocabUnits: number;
    vocabWords: number;
    dictationLists: number;
    dictationResults: number;
    exams: number;
    openHomework: number;
  };
  classes: {
    id: string;
    name: string;
    gradeLevel: string | null;
    studentCount: number;
    dictationCount: number;
    examCount: number;
    avgAccuracy: number | null;
    lastDictation: { id: string; name: string; date: string | null; avgAccuracy: number | null } | null;
  }[];
  recentDictations: {
    id: string; name: string; date: string | null; className: string;
    wordCount: number; avgAccuracy: number | null;
  }[];
  weakWords: { word: string; listName: string; wrongCount: number; totalCount: number; wrongRate: number }[];
  todaySchedule: { className: string; periodNo: number; subject: string; classroom: string }[];
  weekSchedule: { dayOfWeek: number; periodNo: number; className: string; subject: string; classroom: string }[];
  alerts: {
    studentId: string;
    studentName: string;
    studentNo: string | null;
    classId: string;
    className: string;
    streak: number;
    latestAccuracy: number | null;
    latestListName: string;
  }[];
  alertThreshold: number;
};

function accuracyColor(value: number | null): string {
  if (value == null) return "text-muted";
  if (value >= 85) return "text-[#3d7a5e]";
  if (value >= 70) return "text-primary";
  if (value >= 60) return "text-[#8a6230]";
  return "text-[#a64953]";
}

/** 按正确率取渐变起止色，用于进度环 / 进度条 */
function accuracyGradient(value: number | null): [string, string] {
  if (value == null) return ["#c9c7c0", "#a8a69f"];
  if (value >= 85) return ["#7fc0a0", "#3d7a5e"];
  if (value >= 70) return ["#d98b98", "#b8556a"];
  if (value >= 60) return ["#d3a468", "#8a6230"];
  return ["#cf7f87", "#a64953"];
}

/* 核心指标：四块釉面统计卡 */
function StatsCard({ ov }: { ov: Overview }) {
  const stats = [
    { label: "任教班级", hint: "Classes", value: ov.totals.classes, icon: LayoutDashboard,
      color: "#3d6896", glow: "rgba(61,104,150,0.20)", tile: "linear-gradient(160deg,#e9f1f8,#d5e3f0)" },
    { label: "学生总数", hint: "Students", value: ov.totals.students, icon: Users,
      color: "#8a6230", glow: "rgba(168,122,61,0.20)", tile: "linear-gradient(160deg,#f7efe2,#efe2cd)" },
    { label: "听写词表", hint: "Dictations", value: ov.totals.dictationLists, icon: Headphones,
      color: "#b8556a", glow: "rgba(197,100,115,0.22)", tile: "linear-gradient(160deg,#faeef0,#f3dde1)" },
    { label: "待查作业", hint: "Homework", value: ov.totals.openHomework, icon: BookOpen,
      color: "#4a8f74", glow: "rgba(94,159,126,0.20)", tile: "linear-gradient(160deg,#eaf4ee,#d9eadd)" },
  ];
  return (
    <CardContent>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              style={{ "--i": i } as React.CSSProperties}
              className="group relative overflow-hidden rounded-xl border border-white/70 p-4 bg-[linear-gradient(165deg,#ffffff_0%,#fdfcfa_52%,#f7f5f1_100%)] shadow-[0_1px_2px_rgba(36,35,31,0.05),inset_0_1px_0_rgba(255,255,255,0.95)] transition-[transform,box-shadow,border-color] duration-[var(--dur-smooth)] ease-[var(--ease-smooth)] hover:-translate-y-[3px] hover:border-primary/20 hover:shadow-paper-md"
            >
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-50 blur-2xl transition-opacity duration-[var(--dur-slow)] group-hover:opacity-100"
                style={{ background: "radial-gradient(circle, " + s.glow + ", transparent 70%)" }}
              />
              <div
                className="absolute inset-x-0 bottom-0 h-[2px] opacity-40 transition-opacity duration-[var(--dur-smooth)] group-hover:opacity-90"
                style={{ backgroundImage: "linear-gradient(90deg, " + s.color + "cc, " + s.color + "00)" }}
              />
              <div
                className="absolute inset-y-4 left-0 w-[3px] rounded-full opacity-70 transition-opacity duration-[var(--dur-smooth)] group-hover:opacity-100"
                style={{ backgroundImage: "linear-gradient(180deg, " + s.color + ", " + s.color + "33)" }}
              />
              <div className="relative flex items-start justify-between gap-2 pl-2 pr-1">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.7rem] shadow-[0_4px_10px_-3px_rgba(36,35,31,0.32),inset_0_1px_0_rgba(255,255,255,0.5)] transition-transform duration-[var(--dur-smooth)] ease-[var(--ease-spring)] group-hover:scale-[1.08]"
                  style={{ backgroundImage: s.tile, color: s.color }}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </div>
              </div>
              <p className="relative mt-3 flex items-baseline gap-1 pl-2">
                <CountUp value={s.value} className="num-display text-[40px] font-semibold leading-none tracking-tight text-[#24231f]" />
              </p>
              <p className="relative mt-1.5 flex items-center gap-1.5 pl-2 pr-1 text-xs text-neutral-7">
                <span className="h-1 w-1 rounded-full" style={{ backgroundColor: s.color }} />
                <span>{s.label}</span>
                <span className="eyebrow ml-auto text-[9px] opacity-60">{s.hint}</span>
              </p>
            </div>
          );
        })}
      </div>
    </CardContent>
  );
}

/* 班级总览：每班一个进度环 + 二次信息 */
function ClassesCard({ ov }: { ov: Overview }) {
  if (ov.classes.length === 0) {
    return (
      <CardContent>
        <EmptyState icon={<Users className="h-10 w-10" />} title="还没有班级" description="先在顶栏新建班级" />
      </CardContent>
    );
  }
  return (
    <CardContent className="p-0">
      <div className="divide-y divide-line/60">
        {ov.classes.map((c) => {
          const grad = accuracyGradient(c.avgAccuracy);
          return (
            <div
              key={c.id}
              className="group flex items-center gap-3.5 px-5 py-3.5 transition-colors duration-[var(--dur-quick)] hover:bg-[linear-gradient(90deg,rgba(248,228,231,0.45),transparent_72%)]"
            >
              <ProgressRing value={c.avgAccuracy ?? 0} size={48} strokeWidth={5} from={grad[0]} to={grad[1]} id={"cls-" + c.id}>
                <span className="num-display text-[12px] font-semibold leading-none text-text">
                  {c.avgAccuracy == null ? "—" : c.avgAccuracy}
                </span>
              </ProgressRing>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Link href="/dashboard/students" className="truncate font-medium transition-colors duration-[var(--dur-quick)] group-hover:text-primary">
                    {c.name}
                  </Link>
                  {c.gradeLevel && <span className="shrink-0 text-[11px] text-neutral-5">{c.gradeLevel}</span>}
                </div>
                <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
                  <span className="tabular-nums">{c.studentCount} 人</span>
                  <span className="h-2 w-px bg-line" />
                  <span className="tabular-nums">听写 {c.dictationCount} 次</span>
                  <span className="h-2 w-px bg-line" />
                  <span className="tabular-nums">考试 {c.examCount} 次</span>
                </p>
              </div>
              <div className="hidden shrink-0 text-right sm:block">
                <p className="text-[11px] text-neutral-5">最近听写</p>
                <p className="mt-0.5 max-w-[11rem] truncate text-xs text-neutral-7">
                  {c.lastDictation ? c.lastDictation.name : "—"}
                  {c.lastDictation?.date && <span className="ml-1 text-neutral-5">· {c.lastDictation.date}</span>}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-neutral-4 transition-all duration-[var(--dur-quick)] group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
          );
        })}
      </div>
    </CardContent>
  );
}

/* 学情预警 */
function AlertsCard({ ov }: { ov: Overview }) {
  if (ov.alerts.length === 0) {
    return (
      <CardContent>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="relative mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-b from-[#eaf4ee] to-[#d9eadd] text-[#3d7a5e] ring-1 ring-inset ring-[#5e9f7e]/25">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium">全部学生状态良好</p>
          <p className="mt-1 max-w-[16rem] text-xs text-muted">
            连续 2 次听写正确率低于 {ov.alertThreshold}% 的学生会出现在这里
          </p>
        </div>
      </CardContent>
    );
  }
  return (
    <CardContent className="space-y-2 pt-1">
      {ov.alerts.map((a) => (
        <div
          key={a.studentId}
          className="group flex items-center gap-3 rounded-xl border border-[#a87a3d]/15 bg-[linear-gradient(100deg,rgba(247,236,218,0.55),rgba(255,255,255,0.4))] px-3 py-2.5 transition-all duration-[var(--dur-quick)] hover:-translate-y-[1px] hover:border-[#a87a3d]/30 hover:shadow-paper-sm"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(160deg,#f5d9a8,#d9a86a)] text-xs font-medium text-[#6b4a20] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
            {a.studentName.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Link href="/dashboard/students" className="truncate text-sm font-medium transition-colors duration-[var(--dur-quick)] group-hover:text-primary">
                {a.studentName}
              </Link>
              {a.studentNo && <span className="shrink-0 text-[11px] text-neutral-5">#{a.studentNo}</span>}
              <span className="shrink-0 rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] text-neutral-6 ring-1 ring-inset ring-line/70">
                {a.className}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted">最近 · {a.latestListName || "—"}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="num-display text-lg font-semibold leading-none text-[#a64953]">
              {a.latestAccuracy == null ? "—" : a.latestAccuracy + "%"}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#a87a3d]/12 px-1.5 py-0.5 text-[10px] font-medium text-[#8a6230]">
              <AlertTriangle className="h-2.5 w-2.5" />
              连续 {a.streak} 次
            </p>
          </div>
        </div>
      ))}
    </CardContent>
  );
}

/* 今日课表：时间轴 */
function TodayScheduleCard({ ov }: { ov: Overview }) {
  if (ov.todaySchedule.length === 0) {
    return (
      <CardContent>
        <div className="flex flex-col items-center justify-center py-9 text-center">
          <div className="relative mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-b from-[#eaf4ee] to-[#d9eadd] text-[#3d7a5e] ring-1 ring-inset ring-[#5e9f7e]/25">
            <CalendarDays className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium">今天没有排课</p>
          <p className="mt-1 text-xs text-muted">周末愉快，或去「教学课表」补充今天的安排</p>
          <Link
            href="/dashboard/schedule"
            className="mt-3 inline-flex items-center gap-1 rounded-lg border border-line/70 bg-gradient-to-b from-white to-[#faf9f7] px-2.5 py-1 text-xs font-medium text-neutral-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-[var(--dur-quick)] hover:-translate-y-[1px] hover:border-primary/30 hover:text-primary"
          >
            去设置课表
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    );
  }
  return (
    <CardContent className="pt-1">
      <ol className="relative ml-1 space-y-1 pl-5">
        <span className="pointer-events-none absolute bottom-2 left-[3px] top-2 w-px bg-[repeating-linear-gradient(180deg,var(--line)_0_4px,transparent_4px_8px)]" />
        {ov.todaySchedule.map((c, i) => {
          const style = c.subject ? subjectStyle(c.subject) : null;
          return (
            <li
              key={c.className + "-" + c.periodNo + "-" + i}
              className="group relative -ml-5 flex items-center gap-3 rounded-lg py-2 pl-5 pr-2 transition-colors duration-[var(--dur-quick)] hover:bg-neutral-2/60"
            >
              <span
                className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full ring-4 ring-panel transition-transform duration-[var(--dur-quick)] group-hover:scale-125"
                style={{ backgroundColor: style?.color ?? "var(--color-neutral-5)" }}
              />
              <span className="num-display w-9 shrink-0 text-[13px] font-semibold tabular-nums text-neutral-6">
                第{c.periodNo}节
              </span>
              <span className="truncate text-sm font-medium">{c.className}</span>
              <span
                className="ml-auto shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium"
                style={style ? { color: style.color, backgroundColor: style.bg } : { color: "var(--color-neutral-6)", backgroundColor: "var(--color-neutral-2)" }}
              >
                {c.subject || "未填写"}
                {c.classroom ? " · " + c.classroom : ""}
              </span>
            </li>
          );
        })}
      </ol>
    </CardContent>
  );
}

/* 本周课表：色块网格 */
const WEEK_DAYS = ["周一", "周二", "周三", "周四", "周五"];
const MAX_PERIODS = 8;

function WeekScheduleCard({ ov, ctx }: { ov: Overview; ctx?: CardRenderCtx }) {
  // 默认只显示当前班级的课表：顶栏已经选好班级，全量展示会让每格堆三四行、噪点过大
  const currentName = ctx?.currentClassName ?? null;
  const scoped = currentName
    ? ov.weekSchedule.filter((w) => w.className === currentName)
    : ov.weekSchedule;
  const rows = scoped.length > 0 ? scoped : ov.weekSchedule;
  if (rows.length === 0) {
    return (
      <CardContent>
        <p className="py-10 text-center text-sm text-muted">尚未设置课表</p>
      </CardContent>
    );
  }

  const cellMap = new Map<string, Overview["weekSchedule"]>();
  for (const c of rows) {
    const k = c.dayOfWeek + "-" + c.periodNo;
    const arr = cellMap.get(k) ?? [];
    arr.push(c);
    cellMap.set(k, arr);
  }
  const maxPeriod = Math.max(MAX_PERIODS, ...rows.map((c) => c.periodNo));

  return (
    <CardContent className="overflow-x-auto p-3">
      <table className="w-full border-separate border-spacing-[3px] text-sm">
        <thead>
          <tr>
            <th className="w-12 rounded-lg bg-neutral-2/60 p-2 text-[11px] font-medium text-muted">节</th>
            {WEEK_DAYS.map((d) => (
              <th key={d} className="rounded-lg bg-neutral-2/60 p-2 text-[11px] font-medium text-neutral-7">{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: maxPeriod }, (_, i) => i + 1).map((period) => (
            <tr key={period}>
              <td className="rounded-lg bg-neutral-2/40 p-2 text-center text-[11px] font-medium text-muted">{period}</td>
              {WEEK_DAYS.map((_, dayIdx) => {
                const day = dayIdx + 1;
                const cells = cellMap.get(day + "-" + period) ?? [];
                const first = cells[0];
                const style = first?.subject ? subjectStyle(first.subject) : null;
                return (
                  <td
                    key={day}
                    className="rounded-lg border border-line/40 p-1.5 align-top transition-all duration-[var(--dur-quick)] hover:-translate-y-[1px] hover:border-primary/25 hover:shadow-paper-xs"
                    style={cells.length > 0 && style ? { backgroundColor: style.bg, borderColor: style.color + "33" } : { backgroundColor: "rgba(255,255,255,0.5)" }}
                  >
                    {cells.map((c, i) => {
                      const st = c.subject ? subjectStyle(c.subject) : null;
                      return (
                        <div key={i} className="leading-tight" style={st ? { color: st.color } : undefined}>
                          <span className="text-[12px] font-medium leading-tight">{c.subject || "—"}</span>
                          {c.classroom && <span className="ml-1 text-[10px] opacity-55">{c.classroom}</span>}
                          {!currentName && <span className="ml-1 text-[10px] opacity-45">{c.className}</span>}
                        </div>
                      );
                    })}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </CardContent>
  );
}

/* 最近听写：趋势 sparkline + 条目正确率条 */
function RecentDictationsCard({ ov }: { ov: Overview }) {
  if (ov.recentDictations.length === 0) {
    return (
      <CardContent>
        <p className="py-10 text-center text-sm text-muted">还没有听写记录</p>
      </CardContent>
    );
  }
  const series = ov.recentDictations.slice().reverse().map((d) => d.avgAccuracy ?? 0);
  const latest = ov.recentDictations[0]?.avgAccuracy;

  return (
    <CardContent className="pt-1">
      <div className="mb-2 flex items-end justify-between gap-3 rounded-xl bg-[linear-gradient(100deg,rgba(248,228,231,0.5),rgba(221,231,240,0.35))] px-3 py-2.5">
        <div>
          <p className="eyebrow">Trend</p>
          <p className="mt-0.5 flex items-baseline gap-1">
            <span className="num-display text-[22px] font-semibold leading-none text-text">
              {latest == null ? "—" : latest}
            </span>
            <span className="text-[11px] text-muted">% 最近一次</span>
          </p>
        </div>
        <Sparkline
          data={series.length > 1 ? series : [series[0] ?? 0, series[0] ?? 0]}
          width={132}
          height={38}
          color="#c56473"
          id="recent-dictations"
        />
      </div>
      <div className="divide-y divide-line/60">
        {ov.recentDictations.map((d) => (
          <div key={d.id} className="group flex items-center gap-3 py-2.5 transition-colors duration-[var(--dur-quick)]">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium">{d.name}</span>
                <span className="shrink-0 text-[11px] text-muted">{d.className}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-neutral-5">{d.date ?? "—"} · {d.wordCount} 词</p>
            </div>
            <div className="w-24 shrink-0">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-3/60">
                <div
                  className="h-full rounded-full transition-[width] duration-[var(--dur-slow)] ease-[var(--ease-quick)]"
                  style={{ width: Math.max(3, Math.min(100, d.avgAccuracy ?? 0)) + "%", backgroundImage: "linear-gradient(90deg,#d98b98,#b8556a)" }}
                />
              </div>
            </div>
            <span className={"w-11 shrink-0 text-right text-sm font-medium tabular-nums " + accuracyColor(d.avgAccuracy)}>
              {d.avgAccuracy == null ? "—" : d.avgAccuracy + "%"}
            </span>
          </div>
        ))}
      </div>
    </CardContent>
  );
}

/* 高频错词：渐变条形排行 */
function WeakWordsCard({ ov }: { ov: Overview }) {
  if (ov.weakWords.length === 0) {
    return (
      <CardContent>
        <p className="py-10 text-center text-sm text-muted">录入听写成绩后，这里会统计最容易错的单词</p>
      </CardContent>
    );
  }
  return (
    <CardContent className="space-y-1.5 pt-1">
      {ov.weakWords.map((w, i) => (
        <div
          key={w.word + "-" + w.listName}
          className="group relative overflow-hidden rounded-lg px-2.5 py-2 transition-colors duration-[var(--dur-quick)] hover:bg-neutral-2/50"
        >
          <div className="flex items-center gap-2">
            <span className="num-display w-5 shrink-0 text-[11px] font-semibold tabular-nums text-neutral-4">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-sm font-medium">{w.word}</span>
            <span className="truncate text-[11px] text-muted">{w.listName}</span>
            <span className="ml-auto shrink-0 text-[11px] tabular-nums text-[#a64953]">错 {w.wrongCount}/{w.totalCount}</span>
            <span className="num-display w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-[#a64953]">{w.wrongRate}%</span>
          </div>
          <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-neutral-3/50">
            <div
              className="h-full rounded-full"
              style={{ width: Math.max(4, Math.min(100, w.wrongRate)) + "%", backgroundImage: "linear-gradient(90deg,#e0b3b9,#a64953)" }}
            />
          </div>
        </div>
      ))}
    </CardContent>
  );
}

/* 数据概况：迷你数据砖 + 快捷入口 */
function DataOverviewCard({ ov }: { ov: Overview }) {
  const links = [
    { href: "/dashboard/students", label: "学生管理", color: "#5c5a55" },
    { href: "/dashboard/dictation", label: "听写与成绩", color: "#3d6896" },
    { href: "/dashboard/vocab", label: "词汇中心", color: "#5e9f7e" },
    { href: "/dashboard/classroom", label: "课堂互动", color: "#c56473" },
    { href: "/dashboard/schedule", label: "设置课表", color: "#a87a3d" },
  ];
  const tiles = [
    { label: "词汇单元", value: ov.totals.vocabUnits },
    { label: "词条总数", value: ov.totals.vocabWords },
    { label: "听写词表", value: ov.totals.dictationLists },
    { label: "已批改格子", value: ov.totals.dictationResults },
  ];
  return (
    <CardContent className="pt-1">
      <div className="grid grid-cols-2 gap-2.5">
        {tiles.map((d) => (
          <div
            key={d.label}
            className="relative overflow-hidden rounded-xl border border-line/60 bg-[linear-gradient(160deg,rgba(240,239,235,0.55),rgba(249,248,245,0.9))] p-3.5 transition-all duration-[var(--dur-quick)] hover:-translate-y-[1px] hover:border-primary/20 hover:shadow-paper-xs"
          >
            <p className="text-[11px] text-muted">{d.label}</p>
            <p className="mt-1">
              <CountUp value={d.value} className="num-display text-[24px] font-semibold leading-none" />
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-line/60 bg-[linear-gradient(165deg,#ffffff,#fcfbf9)] p-3 text-sm font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-[var(--dur-quick)] ease-[var(--ease-smooth)] hover:-translate-y-[2px] hover:border-primary/25 hover:shadow-paper-sm"
          >
            <span className="relative flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: l.color }} />
              <span className="transition-colors duration-[var(--dur-quick)] group-hover:text-primary">{l.label}</span>
            </span>
            <ArrowRight className="relative h-3.5 w-3.5 text-neutral-4 transition-all duration-[var(--dur-quick)] group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        ))}
      </div>
    </CardContent>
  );
}

/** 渲染上下文：当前班级等，供卡片做「按班级收窄」展示 */
export type CardRenderCtx = { currentClassName?: string | null };

export type CardDef = {
  id: string;
  title: string;
  icon: LucideIcon;
  render: (ov: Overview, ctx?: CardRenderCtx) => React.ReactNode;
};

const MStatsCard = memo(StatsCard);
const MClassesCard = memo(ClassesCard);
const MAlertsCard = memo(AlertsCard);
const MTodayScheduleCard = memo(TodayScheduleCard);
const MWeekScheduleCard = memo(WeekScheduleCard);
const MRecentDictationsCard = memo(RecentDictationsCard);
const MWeakWordsCard = memo(WeakWordsCard);
const MDataOverviewCard = memo(DataOverviewCard);

export const CARD_DEFS: CardDef[] = [
  { id: "stats", title: "核心指标", icon: LayoutDashboard, render: (ov) => <MStatsCard ov={ov} /> },
  { id: "classes", title: "班级总览", icon: Users, render: (ov) => <MClassesCard ov={ov} /> },
  { id: "alerts", title: "需要关注的学生", icon: AlertTriangle, render: (ov) => <MAlertsCard ov={ov} /> },
  { id: "todaySchedule", title: "今日课表", icon: CalendarDays, render: (ov) => <MTodayScheduleCard ov={ov} /> },
  { id: "weekSchedule", title: "本周课表", icon: CalendarDays, render: (ov, ctx) => <MWeekScheduleCard ov={ov} ctx={ctx} /> },
  { id: "recentDictations", title: "最近听写", icon: Headphones, render: (ov) => <MRecentDictationsCard ov={ov} /> },
  { id: "weakWords", title: "高频错词 TOP 10", icon: AlertTriangle, render: (ov) => <MWeakWordsCard ov={ov} /> },
  { id: "dataOverview", title: "数据概况", icon: TrendingUp, render: (ov) => <MDataOverviewCard ov={ov} /> },
];

export const DEFAULT_CARD_ORDER = CARD_DEFS.map((c) => c.id);