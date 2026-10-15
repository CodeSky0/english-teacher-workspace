"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useClasses } from "@/hooks/use-classes";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/states";
import {
  LayoutDashboard, CalendarDays, Users, GraduationCap, Headphones,
  BookOpen, AlertTriangle, TrendingUp,
} from "lucide-react";
import { greeting, todayStr } from "@/lib/utils";
import Link from "next/link";

type Overview = {
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
};

function accuracyColor(value: number | null): string {
  if (value == null) return "text-muted";
  if (value >= 85) return "text-green-600";
  if (value >= 70) return "text-primary";
  if (value >= 60) return "text-amber-600";
  return "text-red-600";
}

export default function OverviewPage() {
  const { classes, isLoading: classLoading } = useClasses();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["overview"],
    queryFn: () => apiClient.get<{ data: Overview }>("/overview"),
  });

  const ov = data?.data;

  const stats = [
    { label: "任教班级", value: ov?.totals.classes ?? "—", icon: LayoutDashboard, color: "var(--c-listen)" },
    { label: "学生总数", value: ov?.totals.students ?? "—", icon: Users, color: "var(--c-vocab)" },
    { label: "已布置作业", value: ov?.totals.openHomework ?? "—", icon: BookOpen, color: "var(--c-homework)" },
    { label: "考试场次", value: ov?.totals.exams ?? "—", icon: GraduationCap, color: "var(--c-exam)" },
  ];

  if (isLoading || classLoading) return <LoadingState />;
  if (error) return <ErrorState message="加载失败" onRetry={() => refetch()} />;

  return (
    <div>
      <PageHeader title="总览" description={`${greeting()}！今天是 ${todayStr()}`} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-3 p-4">
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
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 班级总览：一个老师带多个班时的核心视图 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            班级总览
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!ov || ov.classes.length === 0 ? (
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
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" />
              今日课表
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!ov || ov.todaySchedule.length === 0 ? (
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
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Headphones className="h-4 w-4" />
              最近听写
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!ov || ov.recentDictations.length === 0 ? (
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
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4" />
              高频错词 TOP 10
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!ov || ov.weakWords.length === 0 ? (
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
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              数据概况
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-line p-3">
                <p className="text-xs text-muted">词汇单元</p>
                <p className="text-lg font-bold">{ov?.totals.vocabUnits ?? 0}</p>
              </div>
              <div className="rounded-md border border-line p-3">
                <p className="text-xs text-muted">词条总数</p>
                <p className="text-lg font-bold">{ov?.totals.vocabWords ?? 0}</p>
              </div>
              <div className="rounded-md border border-line p-3">
                <p className="text-xs text-muted">听写词表</p>
                <p className="text-lg font-bold">{ov?.totals.dictationLists ?? 0}</p>
              </div>
              <div className="rounded-md border border-line p-3">
                <p className="text-xs text-muted">已批改格子</p>
                <p className="text-lg font-bold">{ov?.totals.dictationResults ?? 0}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href="/dashboard/students" className="rounded-md border border-line p-3 text-sm hover:bg-bg">学生管理</Link>
              <Link href="/dashboard/dictation" className="rounded-md border border-line p-3 text-sm hover:bg-bg">听写与成绩</Link>
              <Link href="/dashboard/vocab" className="rounded-md border border-line p-3 text-sm hover:bg-bg">词汇中心</Link>
              <Link href="/dashboard/schedule" className="rounded-md border border-line p-3 text-sm hover:bg-bg">设置课表</Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {classes.length > 1 && (
        <p className="mt-4 text-xs text-muted">
          当前共 {classes.length} 个班级，切换班级请使用顶栏班级选择器。
        </p>
      )}
    </div>
  );
}
