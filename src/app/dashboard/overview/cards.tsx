import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import {
  LayoutDashboard, CalendarDays, Users, GraduationCap, Headphones,
  BookOpen, AlertTriangle, TrendingUp, type LucideIcon,
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
  if (value >= 85) return "text-green-600";
  if (value >= 70) return "text-primary";
  if (value >= 60) return "text-amber-600";
  return "text-red-600";
}

function StatsCard({ ov }: { ov: Overview }) {
  const stats = [
    { label: "任教班级", value: ov.totals.classes, icon: LayoutDashboard, color: "var(--c-listen)" },
    { label: "学生总数", value: ov.totals.students, icon: Users, color: "var(--c-vocab)" },
    { label: "已布置作业", value: ov.totals.openHomework, icon: BookOpen, color: "var(--c-homework)" },
    { label: "考试场次", value: ov.totals.exams, icon: GraduationCap, color: "var(--c-exam)" },
  ];
  return (
    <CardContent>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex items-center gap-3 rounded-lg border border-line p-4">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ background: `${s.color}1a`, color: s.color }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted">{s.label}</p>
                <p className="text-xl font-bold text-text">{s.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </CardContent>
  );
}

function ClassesCard({ ov }: { ov: Overview }) {
  return (
    <CardContent className="p-0">
      {ov.classes.length === 0 ? (
        <EmptyState icon={<Users className="h-10 w-10" />} title="还没有班级" description="先在顶栏新建班级" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="px-4 py-3 font-medium">班级</th>
                <th className="px-4 py-3 font-medium">人数</th>
                <th className="px-4 py-3 font-medium">听写次数</th>
                <th className="px-4 py-3 font-medium">平均正确率</th>
                <th className="px-4 py-3 font-medium">最近一次听写</th>
                <th className="px-4 py-3 font-medium">考试</th>
              </tr>
            </thead>
            <tbody>
              {ov.classes.map((c) => (
                <tr key={c.id} className="border-b border-line/50 hover:bg-bg/50">
                  <td className="px-4 py-2.5">
                    <Link href="/dashboard/students" className="font-medium hover:text-primary">{c.name}</Link>
                    {c.gradeLevel && <span className="ml-2 text-xs text-muted">{c.gradeLevel}</span>}
                  </td>
                  <td className="px-4 py-2.5">{c.studentCount}</td>
                  <td className="px-4 py-2.5">{c.dictationCount}</td>
                  <td className={`px-4 py-2.5 font-medium ${accuracyColor(c.avgAccuracy)}`}>
                    {c.avgAccuracy == null ? "—" : `${c.avgAccuracy}%`}
                  </td>
                  <td className="px-4 py-2.5 text-muted">
                    {c.lastDictation ? (
                      <span>
                        {c.lastDictation.name}
                        {c.lastDictation.date && <span className="ml-1 text-xs">· {c.lastDictation.date}</span>}
                        {c.lastDictation.avgAccuracy != null && (
                          <span className={`ml-1 text-xs ${accuracyColor(c.lastDictation.avgAccuracy)}`}>
                            {c.lastDictation.avgAccuracy}%
                          </span>
                        )}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-2.5">{c.examCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CardContent>
  );
}

function AlertsCard({ ov }: { ov: Overview }) {
  return (
    <CardContent className="p-0">
      {ov.alerts.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">暂无需要关注的学生</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="px-4 py-2.5 font-medium">学生</th>
                <th className="px-4 py-2.5 font-medium">班级</th>
                <th className="px-4 py-2.5 font-medium">连续不达标</th>
                <th className="px-4 py-2.5 font-medium">最近一次</th>
              </tr>
            </thead>
            <tbody>
              {ov.alerts.map((a) => (
                <tr key={a.studentId} className="border-b border-line/50 hover:bg-bg/50">
                  <td className="px-4 py-2.5">
                    <Link href="/dashboard/students" className="font-medium hover:text-primary">{a.studentName}</Link>
                    {a.studentNo && <span className="ml-2 text-xs text-muted">{a.studentNo}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-muted">{a.className}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline" className="border-amber-400 text-amber-600">{a.streak} 次</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`font-medium ${accuracyColor(a.latestAccuracy)}`}>
                      {a.latestAccuracy == null ? "—" : `${a.latestAccuracy}%`}
                    </span>
                    <span className="ml-1 text-xs text-muted">· {a.latestListName}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CardContent>
  );
}

function TodayScheduleCard({ ov }: { ov: Overview }) {
  return (
    <CardContent>
      {ov.todaySchedule.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">今天没有排课，或尚未设置课表</p>
      ) : (
        <div className="divide-y divide-line">
          {ov.todaySchedule.map((c, i) => (
            <div key={`${c.className}-${c.periodNo}-${i}`} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Badge variant="muted">第 {c.periodNo} 节</Badge>
                <span className="text-sm font-medium">{c.className}</span>
              </div>
              <span className="text-sm text-muted">
                {c.subject || "未填写"}
                {c.classroom ? ` · ${c.classroom}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  );
}

const WEEK_DAYS = ["周一", "周二", "周三", "周四", "周五"];
const MAX_PERIODS = 8;

function WeekScheduleCard({ ov }: { ov: Overview }) {
  if (ov.weekSchedule.length === 0) {
    return (
      <CardContent>
        <p className="py-8 text-center text-sm text-muted">尚未设置课表</p>
      </CardContent>
    );
  }

  const cellMap = new Map<string, Overview["weekSchedule"]>();
  for (const c of ov.weekSchedule) {
    const k = `${c.dayOfWeek}-${c.periodNo}`;
    const arr = cellMap.get(k) ?? [];
    arr.push(c);
    cellMap.set(k, arr);
  }
  const maxPeriod = Math.max(MAX_PERIODS, ...ov.weekSchedule.map((c) => c.periodNo));

  return (
    <CardContent className="p-2 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-12 border border-line bg-bg p-2 text-xs font-medium text-muted">节</th>
            {WEEK_DAYS.map((d) => (
              <th key={d} className="border border-line bg-bg p-2 font-medium">{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: maxPeriod }, (_, i) => i + 1).map((period) => (
            <tr key={period}>
              <td className="border border-line bg-bg p-2 text-center text-xs font-medium text-muted">{period}</td>
              {WEEK_DAYS.map((_, dayIdx) => {
                const day = dayIdx + 1;
                const cells = cellMap.get(`${day}-${period}`) ?? [];
                return (
                  <td key={day} className="border border-line p-1 align-top">
                    {cells.map((c, i) => {
                      const style = c.subject ? subjectStyle(c.subject) : null;
                      return (
                        <div key={i} className="leading-tight" style={style ? { color: style.color } : undefined}>
                          <span className="font-medium">{c.subject || "—"}</span>
                          <span className="ml-1 text-xs opacity-70">{c.className}</span>
                          {c.classroom && <span className="ml-1 text-xs opacity-50">{c.classroom}</span>}
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

function RecentDictationsCard({ ov }: { ov: Overview }) {
  return (
    <CardContent>
      {ov.recentDictations.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">还没有听写记录</p>
      ) : (
        <div className="divide-y divide-line">
          {ov.recentDictations.map((d) => (
            <div key={d.id} className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm font-medium">{d.name}</span>
                <span className="ml-2 text-xs text-muted">{d.className}</span>
                {d.date && <span className="ml-1 text-xs text-muted">· {d.date}</span>}
              </div>
              <span className={`text-sm font-medium ${accuracyColor(d.avgAccuracy)}`}>
                {d.avgAccuracy == null ? `${d.wordCount} 词` : `${d.avgAccuracy}%`}
              </span>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  );
}

function WeakWordsCard({ ov }: { ov: Overview }) {
  return (
    <CardContent>
      {ov.weakWords.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">录入听写成绩后，这里会统计最容易错的单词</p>
      ) : (
        <div className="divide-y divide-line">
          {ov.weakWords.map((w) => (
            <div key={`${w.word}-${w.listName}`} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{w.word}</span>
                <span className="text-xs text-muted">{w.listName}</span>
              </div>
              <span className="text-sm text-red-500">
                错 {w.wrongCount}/{w.totalCount} · {w.wrongRate}%
              </span>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  );
}

function DataOverviewCard({ ov }: { ov: Overview }) {
  return (
    <CardContent>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md border border-line p-3">
          <p className="text-xs text-muted">词汇单元</p>
          <p className="text-lg font-bold">{ov.totals.vocabUnits}</p>
        </div>
        <div className="rounded-md border border-line p-3">
          <p className="text-xs text-muted">词条总数</p>
          <p className="text-lg font-bold">{ov.totals.vocabWords}</p>
        </div>
        <div className="rounded-md border border-line p-3">
          <p className="text-xs text-muted">听写词表</p>
          <p className="text-lg font-bold">{ov.totals.dictationLists}</p>
        </div>
        <div className="rounded-md border border-line p-3">
          <p className="text-xs text-muted">已批改格子</p>
          <p className="text-lg font-bold">{ov.totals.dictationResults}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link href="/dashboard/students" className="rounded-md border border-line p-3 text-sm hover:bg-bg">学生管理</Link>
        <Link href="/dashboard/dictation" className="rounded-md border border-line p-3 text-sm hover:bg-bg">听写与成绩</Link>
        <Link href="/dashboard/vocab" className="rounded-md border border-line p-3 text-sm hover:bg-bg">词汇中心</Link>
        <Link href="/dashboard/classroom" className="rounded-md border border-line p-3 text-sm hover:bg-bg">课堂互动</Link>
        <Link href="/dashboard/schedule" className="rounded-md border border-line p-3 text-sm hover:bg-bg">设置课表</Link>
      </div>
    </CardContent>
  );
}

export type CardDef = {
  id: string;
  title: string;
  icon: LucideIcon;
  render: (ov: Overview) => React.ReactNode;
};

export const CARD_DEFS: CardDef[] = [
  { id: "stats", title: "核心指标", icon: LayoutDashboard, render: (ov) => <StatsCard ov={ov} /> },
  { id: "classes", title: "班级总览", icon: Users, render: (ov) => <ClassesCard ov={ov} /> },
  { id: "alerts", title: "需要关注的学生", icon: AlertTriangle, render: (ov) => <AlertsCard ov={ov} /> },
  { id: "todaySchedule", title: "今日课表", icon: CalendarDays, render: (ov) => <TodayScheduleCard ov={ov} /> },
  { id: "weekSchedule", title: "本周课表", icon: CalendarDays, render: (ov) => <WeekScheduleCard ov={ov} /> },
  { id: "recentDictations", title: "最近听写", icon: Headphones, render: (ov) => <RecentDictationsCard ov={ov} /> },
  { id: "weakWords", title: "高频错词 TOP 10", icon: AlertTriangle, render: (ov) => <WeakWordsCard ov={ov} /> },
  { id: "dataOverview", title: "数据概况", icon: TrendingUp, render: (ov) => <DataOverviewCard ov={ov} /> },
];

export const DEFAULT_CARD_ORDER = CARD_DEFS.map((c) => c.id);
