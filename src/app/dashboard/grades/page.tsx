"use client";

import { useState, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { apiClient } from "@/lib/api-client";
import { useCurrentClass } from "@/hooks/use-classes";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { ProgressRing } from "@/components/charts/progress-ring";
import { Sparkline } from "@/components/charts/sparkline";
import { MetricTile } from "@/components/charts/metric-tile";
import {
  Plus, GraduationCap, ChevronRight, Users, TrendingUp, Award, ArrowDownRight,
  CalendarDays, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";
import { ScoreDistribution } from "./score-distribution";

const AnalyticsPanel = dynamic(() => import("./analytics-panel").then((m) => m.AnalyticsPanel), {
  ssr: false,
  loading: () => <LoadingState />,
});

type Exam = { id: string; name: string; classId: string; examDate: string | null; type: string | null; remark: string | null };
type Score = { id: string; examId: string; studentId: string; listeningScore: string | null; speakingScore: string | null; writtenScore: string | null; totalScore: string | null; totalIsManual: boolean };
type Student = { id: string; name: string; studentNo: string | null };

/** 班级画像（与 analytics-panel 共用同一 queryKey，不会重复请求） */
type ClassProfile = {
  className: string; studentCount: number; examCount: number;
  dimensions: { listening: number; speaking: number; writing: number; total: number };
  scoreCount: number;
};
type TrendItem = {
  examId: string; examName: string; examDate: string | null;
  listening: number; speaking: number; writing: number; total: number;
};

/** 头像渐变（按名字稳定取色，不随筛选变化）；深色字保证对比度 */
const AVATAR_TONES = [
  { bg: "linear-gradient(160deg,#f3c6cd,#e0a3ac)", fg: "#7c3a44" },
  { bg: "linear-gradient(160deg,#c9dbeb,#a9c6df)", fg: "#2f5478" },
  { bg: "linear-gradient(160deg,#cfe6d9,#aad3bf)", fg: "#2f6349" },
  { bg: "linear-gradient(160deg,#efdcbd,#e3c795)", fg: "#6b4a20" },
  { bg: "linear-gradient(160deg,#e6d6e8,#d3b7d7)", fg: "#6b4368" },
];
function avatarTone(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

function calcTotal(s: Pick<Score, "listeningScore" | "speakingScore" | "writtenScore" | "totalScore" | "totalIsManual">): string | null {
  if (s.totalIsManual && s.totalScore) return s.totalScore;
  const l = s.listeningScore ? Number(s.listeningScore) : null;
  const sp = s.speakingScore ? Number(s.speakingScore) : null;
  const w = s.writtenScore ? Number(s.writtenScore) : null;
  if (l != null && sp != null && w != null) return String(l + sp + w);
  return s.totalScore ?? null;
}

export default function GradesPage() {
  const { currentClass, isLoading: classLoading } = useCurrentClass();
  const qc = useQueryClient();
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [examDialog, setExamDialog] = useState(false);
  const [examForm, setExamForm] = useState({ name: "", examDate: "", type: "", remark: "" });

  const { data: examsData, isLoading: examsLoading } = useQuery({
    queryKey: ["exams", currentClass?.id],
    queryFn: () => apiClient.get<{ data: Exam[] }>(`/exams${currentClass ? `?classId=${currentClass.id}` : ""}`),
    enabled: !!currentClass,
  });
  const exams = examsData?.data ?? [];

  /** 顶部 KPI 条数据：与 AnalyticsPanel 用完全相同的 queryKey / 接口，命中同一份缓存 */
  const { data: profileData } = useQuery({
    queryKey: ["analytics-profile", currentClass?.id],
    queryFn: () => apiClient.get<{ data: ClassProfile }>(`/analytics/class/${currentClass?.id}/profile`),
    enabled: !!currentClass && !selectedExam,
  });
  const { data: trendData } = useQuery({
    queryKey: ["analytics-trend", currentClass?.id],
    queryFn: () => apiClient.get<{ data: TrendItem[] }>(`/analytics/class/${currentClass?.id}/trend`),
    enabled: !!currentClass && !selectedExam,
  });
  const profile = profileData?.data;
  const trend = trendData?.data ?? [];

  const { data: studentsData } = useQuery({
    queryKey: ["students", currentClass?.id],
    queryFn: () => apiClient.get<{ data: Student[] }>(`/students?classId=${currentClass?.id}`),
    enabled: !!currentClass && !!selectedExam,
  });
  const students = studentsData?.data ?? [];

  const { data: scoresData } = useQuery({
    queryKey: ["scores", selectedExam?.id],
    queryFn: () => apiClient.get<{ data: Score[] }>(`/exams/${selectedExam?.id}/scores`),
    enabled: !!selectedExam,
  });
  const scores = useMemo(() => scoresData?.data ?? [], [scoresData]);
  const scoreMap = new Map(scores.map((s) => [s.studentId, s]));

  const gradesScrollRef = useRef<HTMLDivElement>(null);
  const gradesRowVirtualizer = useVirtualizer({
    count: students.length,
    getScrollElement: () => gradesScrollRef.current,
    estimateSize: () => 48,
    overscan: 8,
  });

  const createExamMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => apiClient.post("/exams", { ...d, classId: currentClass?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["exams"] }); toast.success("考试创建成功"); setExamDialog(false); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });

  const saveScoreMut = useMutation({
    mutationFn: async (params: { studentId: string; listening?: string; speaking?: string; written?: string }) => {
      const existing = scoreMap.get(params.studentId);
      if (existing) {
        return apiClient.patch(`/exams/scores/${existing.id}`, {
          listeningScore: params.listening ?? null, speakingScore: params.speaking ?? null, writtenScore: params.written ?? null,
        });
      }
      return apiClient.post(`/exams/${selectedExam?.id}/scores`, {
        studentId: params.studentId,
        listeningScore: params.listening ?? null, speakingScore: params.speaking ?? null, writtenScore: params.written ?? null,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scores"] }),
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });

  const totals = useMemo(
    () => scores.map((s) => calcTotal(s)).filter((t): t is string => t != null).map(Number).filter((n) => Number.isFinite(n)),
    [scores],
  );

  const stats = useMemo(() => {
    if (totals.length === 0) return null;
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
    const passRate = (totals.filter((t) => t >= 60).length / totals.length) * 100;
    return {
      avg: Math.round(avg * 10) / 10,
      max: Math.max(...totals),
      min: Math.min(...totals),
      count: totals.length,
      passRate: Math.round(passRate),
      sorted: totals.slice().sort((a, b) => a - b),
    };
  }, [totals]);

  function handleScoreChange(studentId: string, field: "listening" | "speaking" | "written", value: string) {
    const existing = scoreMap.get(studentId);
    const l = field === "listening" ? value : (existing?.listeningScore ?? "");
    const sp = field === "speaking" ? value : (existing?.speakingScore ?? "");
    const w = field === "written" ? value : (existing?.writtenScore ?? "");
    saveScoreMut.mutate({ studentId, listening: l, speaking: sp, written: w });
  }

  /* 顶部 KPI 派生值：示例数据的 total_score 为 null，展示「—」并忽略空值，绝不前端伪造总分 */
  const round1 = (v: number) => Math.round(v * 10) / 10;
  const totalAvg: number | null = profile && profile.dimensions.total > 0 ? profile.dimensions.total : null;
  const totalPct = totalAvg != null ? Math.max(0, Math.min(100, (totalAvg / 150) * 100)) : 0;
  const trendSeries = trend.map((t) => t.total).filter((v) => v > 0);
  const rawDelta: number | null =
    trendSeries.length > 1
      ? Math.round((trendSeries[trendSeries.length - 1] - trendSeries[trendSeries.length - 2]) * 10) / 10
      : null;

  if (classLoading) return <LoadingState />;
  if (!currentClass) return <div><PageHeader title="学情分析" /><Card><CardContent className="py-12"><EmptyState icon={<GraduationCap className="h-10 w-10" />} title="请先选择班级" /></CardContent></Card></div>;

  return (
    <div>
      <PageHeader title="学情分析" description={`${currentClass.name} · 共 ${exams.length} 场考试`}
        action={<Button onClick={() => setExamDialog(true)} className="gap-1.5"><Plus className="h-4 w-4" />创建考试</Button>} />

      {!selectedExam ? (
        <>
        {/* ══════════ Hero：墨色极光数据头 ══════════ */}
        <section className="spotlight relative mb-5 overflow-hidden rounded-[26px] shadow-[0_2px_4px_rgba(36,35,31,0.06),0_30px_64px_-30px_rgba(74,32,44,0.62)] animate-fade-in-up">
          {/* ① 墨色极光底：玫瑰 → 赭 → 紫 → 縹蓝 */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,#45202c_0%,#643040_16%,#8a4a52_32%,#8d5f60_48%,#6b5a7c_66%,#3f5878_84%,#2d4761_100%)]" />
          <div className="pointer-events-none absolute -left-24 -top-32 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(255,170,150,0.42),transparent_62%)]" />
          <div className="pointer-events-none absolute -right-24 -top-32 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(126,172,255,0.32),transparent_64%)]" />
          <div className="pointer-events-none absolute -bottom-52 left-1/3 h-[24rem] w-[32rem] rounded-full bg-[radial-gradient(ellipse,rgba(120,220,190,0.20),transparent_68%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.10] grid-veil" />
          {/* ② 同心圆轨道 */}
          <svg className="pointer-events-none absolute -right-10 top-1/2 hidden h-[21rem] w-[21rem] -translate-y-1/2 text-white/20 lg:block animate-drift" viewBox="0 0 200 200" fill="none" aria-hidden>
            <circle cx="100" cy="100" r="92" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="72" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 6" />
            <circle cx="100" cy="100" r="52" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="30" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 5" />
            <line x1="8" y1="100" x2="192" y2="100" stroke="currentColor" strokeWidth="0.3" />
            <line x1="100" y1="8" x2="100" y2="192" stroke="currentColor" strokeWidth="0.3" />
          </svg>
          {/* ③ 英文水印 */}
          <span aria-hidden className="pointer-events-none absolute -bottom-7 right-2 hidden select-none font-display text-[8rem] font-semibold leading-none tracking-tight text-white/[0.07] lg:block">
            Analytics
          </span>

          <div className="relative flex flex-col gap-6 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between lg:gap-9">
            {/* 左：文案 + 概览 */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="eyebrow text-white/55">Class Analytics</span>
                <span className="h-3 w-px bg-white/25" />
                <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] text-white/85 backdrop-blur-sm">
                  <CalendarDays className="h-3 w-3" />
                  {currentClass.name}
                </span>
              </div>
              <h2 className="mt-3.5 max-w-xl font-serif text-[28px] font-semibold leading-[1.16] tracking-tight text-white sm:text-[33px] lg:text-[38px]">
                班级学情，
                <span className="bg-[linear-gradient(100deg,#ffe9d8_0%,#ffc9c4_38%,#dcc9ff_70%,#bfe4ff_100%)] bg-clip-text text-transparent">
                  看见每一次进步。
                </span>
              </h2>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/75">
                <span className="inline-flex items-baseline gap-1.5">
                  <Users className="h-3.5 w-3.5 self-center text-white/50" />
                  <b className="num-display text-[19px] font-semibold leading-none text-white">{profile?.studentCount ?? "—"}</b> 名学生
                </span>
                <span className="h-3.5 w-px bg-white/20" />
                <span className="inline-flex items-baseline gap-1.5">
                  <FileText className="h-3.5 w-3.5 self-center text-white/50" />
                  <b className="num-display text-[19px] font-semibold leading-none text-white">{exams.length}</b> 场考试
                </span>
                <span className="h-3.5 w-px bg-white/20" />
                <span className="inline-flex items-baseline gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 self-center text-white/50" />
                  已录入 <b className="num-display text-[19px] font-semibold leading-none text-white">{profile?.scoreCount ?? 0}</b> 条成绩
                </span>
              </div>
            </div>

            {/* 右：玻璃仪表卡 */}
            <div className="relative shrink-0">
              <div className="flex items-center gap-4 rounded-2xl border border-white/25 bg-white/[0.12] px-4 py-3.5 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-xl sm:px-5">
                <ProgressRing value={totalPct} size={104} strokeWidth={8} from="#ffd9c0" to="#a9c8ff" trackColor="rgba(255,255,255,0.16)" id="grades-hero-ring">
                  <div className="text-center leading-none">
                    <div className="num-display text-[30px] font-semibold text-white">{totalAvg == null ? "—" : round1(totalAvg)}</div>
                    <div className="eyebrow mt-1 text-[9px] text-white/55">avg</div>
                  </div>
                </ProgressRing>
                <div className="min-w-0">
                  <p className="eyebrow text-white/55">Overall</p>
                  <p className="mt-1 text-[13px] font-medium text-white/90">总分均分 / 150</p>
                  <div className="mt-1.5">
                    {trendSeries.length > 0 ? (
                      <Sparkline
                        data={trendSeries.length > 1 ? trendSeries.slice(-12) : [trendSeries[0], trendSeries[0]]}
                        width={108}
                        height={28}
                        color="#ffd9c0"
                        showDot={false}
                        id="grades-hero-spark"
                      />
                    ) : (
                      <p className="text-[11px] text-white/45">等待总分数据</p>
                    )}
                  </div>
                  {trendSeries.length > 0 && (
                    <p className="mt-1 text-[11px] text-white/60">
                      {rawDelta == null ? (
                        "等待更多考试数据"
                      ) : rawDelta === 0 ? (
                        "与上次基本持平"
                      ) : (
                        <span className={rawDelta > 0 ? "text-[#a8e6c4]" : "text-[#ffb3b3]"}>
                          {rawDelta > 0 ? "↑" : "↓"} {Math.abs(rawDelta)} 分 较上次
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ④ 底部 KPI 行：深色区内只放 4 个白色大数字，不堆卡片 */}
          <div className="relative border-t border-white/15 px-6 pb-5 pt-4 sm:px-7">
            <div className="grid grid-cols-2 gap-y-4 sm:grid-cols-4">
              {[
                { label: "听力均分", en: "Listening", value: profile?.dimensions.listening, suffix: "分" },
                { label: "口语均分", en: "Speaking", value: profile?.dimensions.speaking, suffix: "分" },
                { label: "写作均分", en: "Writing", value: profile?.dimensions.writing, suffix: "分" },
                { label: "已录入成绩", en: "Recorded", value: profile?.scoreCount, suffix: "条" },
              ].map((k, i) => (
                <div key={k.label} className={i > 0 ? "sm:border-l sm:border-white/12 sm:pl-6" : ""}>
                  <p className="eyebrow text-[9px] text-white/60">{k.en}</p>
                  <p className="mt-1.5 flex items-baseline gap-1">
                    <span className="num-display text-[26px] font-semibold leading-none text-white">
                      {k.value == null ? "—" : round1(k.value)}
                    </span>
                    {k.value != null && <span className="text-[11px] text-white/60">{k.suffix}</span>}
                  </p>
                  <p className="mt-1 text-[11px] text-white/65">{k.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Card className="mb-4">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="eyebrow text-neutral-6">Exams</p>
                <CardTitle className="mt-1.5 flex items-center gap-2 text-[15px]">
                  <span className="icon-slot"><GraduationCap /></span>
                  考试档案
                  <Badge variant="muted">{exams.length} 场</Badge>
                </CardTitle>
              </div>
              <p className="text-[11px] text-muted">点击任意考试进入成绩录入</p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {examsLoading ? <LoadingState /> : exams.length === 0 ? <EmptyState icon={<GraduationCap className="h-10 w-10" />} title="暂无考试" description="点击右上角创建考试" /> :
              <div className="divide-y divide-line/70">
                {exams.map((e) => (
                  <button key={e.id} onClick={() => setSelectedExam(e)}
                    className="group relative flex w-full items-center gap-3.5 p-4 pl-5 text-left transition-colors duration-[var(--dur-quick)] hover:bg-gradient-to-r hover:from-[#f8e4e7]/55 hover:via-[#f8e4e7]/12 hover:to-transparent">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.6rem] bg-gradient-to-b from-[#e9f0f6] to-[#dee8f0] text-[#3d6896] ring-1 ring-inset ring-[#3d6896]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform duration-[var(--dur-smooth)] ease-[var(--ease-spring)] group-hover:scale-105">
                      <GraduationCap className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium tracking-[0.01em] transition-colors duration-[var(--dur-quick)] group-hover:text-primary-d">{e.name}</span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {e.examDate || "未定日期"}{e.type ? ` · ${e.type}` : ""}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-all duration-[var(--dur-quick)] group-hover:translate-x-0.5 group-hover:text-primary" />
                  </button>
                ))}
              </div>}
          </CardContent>
        </Card>

        <AnalyticsPanel classId={currentClass.id} />
        </>
      ) : (
        <div className="space-y-4">
          {/* 考试详情头部：面包屑 + 及格率环 */}
          <div className="spotlight relative overflow-hidden rounded-xl border border-white/70 bg-[linear-gradient(115deg,#fff7f7,#fbf8f4_46%,#f5f7fa)] px-3.5 py-2.5 shadow-[0_1px_2px_rgba(36,35,31,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]">
            <div className="relative flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                <button onClick={() => setSelectedExam(null)}
                  className="group inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-xs text-neutral-6 ring-1 ring-inset ring-line shadow-[var(--shadow-xs)] transition-all duration-[var(--dur-quick)] hover:-translate-x-[1px] hover:text-primary-d hover:shadow-[var(--shadow-sm)]">
                  <ChevronRight className="h-3.5 w-3.5 rotate-180 transition-transform duration-[var(--dur-quick)] group-hover:-translate-x-0.5" />
                  返回考试列表
                </button>
                <h3 className="truncate font-serif text-[18px] tracking-[0.01em]">{selectedExam.name}</h3>
                {selectedExam.examDate && <span className="rounded-md bg-white/70 px-2 py-[1px] text-[11px] tabular-nums text-muted ring-1 ring-inset ring-line/70">{selectedExam.examDate}</span>}
                {selectedExam.type && <Badge variant="info">{selectedExam.type}</Badge>}
              </div>
              {stats && (
                <div className="flex items-center gap-3">
                  <ProgressRing value={stats.passRate} size={46} strokeWidth={5} from="#9ccbb2" to="#3d7a5e" id="exam-pass">
                    <span className="num-display text-[10px] font-semibold text-[#3d7a5e]">{stats.passRate}%</span>
                  </ProgressRing>
                  <div className="leading-tight">
                    <p className="eyebrow text-[9px] text-neutral-6">Pass Rate</p>
                    <p className="mt-0.5 text-[12px] font-medium">及格率 · {stats.count} 人参评</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {stats && (
            <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricTile index={0} label="参评人数" hint="Students" value={stats.count} suffix="人" icon={Users} tone="sumi" />
              <MetricTile index={1} label="平均分" hint="Average" value={stats.avg} decimals={1} icon={TrendingUp} tone="ume" spark={stats.sorted} sparkWidth={64} />
              <MetricTile index={2} label="最高分" hint="Highest" value={stats.max} icon={Award} tone="wakatake" />
              <MetricTile index={3} label="最低分" hint="Lowest" value={stats.min} icon={ArrowDownRight} tone="exam" />
            </div>
          )}
          {totals.length > 0 && <ScoreDistribution totals={totals} />}

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="eyebrow text-neutral-6">Score Entry</p>
                  <CardTitle className="mt-1.5 flex items-center gap-2 text-[15px]">
                    <span className="icon-slot"><FileText /></span>
                    成绩录入
                    <Badge variant="muted">{students.length} 人</Badge>
                  </CardTitle>
                </div>
                <p className="text-[11px] text-muted">失焦自动保存 · 总分由三项自动求和</p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {students.length === 0 ? <EmptyState title="暂无学生" description="请先在学生管理中添加学生" /> :
                <div ref={gradesScrollRef} className="max-h-[70vh] overflow-auto scrollbar-thin" style={{ contain: "layout style" }}>
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10"><tr className="table-head border-b border-line text-left text-xs text-muted backdrop-blur-sm">
                      <th className="px-4 py-3 font-medium">学生</th>
                      <th className="px-4 py-3 font-medium">听力</th>
                      <th className="px-4 py-3 font-medium">口语</th>
                      <th className="px-4 py-3 font-medium">笔试</th>
                      <th className="px-4 py-3 font-medium">总分</th>
                    </tr></thead>
                    <tbody>
                      {(() => {
                        const items = gradesRowVirtualizer.getVirtualItems();
                        if (items.length === 0) return null;
                        const padTop = items[0].start;
                        const padBottom = gradesRowVirtualizer.getTotalSize() - items[items.length - 1].end;
                        return (
                          <>
                            {padTop > 0 && <tr style={{ height: padTop }}><td colSpan={5} /></tr>}
                            {items.map((vr) => {
                              const st = students[vr.index];
                              const sc = scoreMap.get(st.id);
                              const total = sc ? calcTotal(sc) : null;
                              const tone = avatarTone(st.name);
                              return (
                                <tr key={st.id} className="group border-b border-line/50 transition-colors duration-[var(--dur-quick)] hover:bg-gradient-to-r hover:from-[#f8e4e7]/50 hover:to-transparent" style={{ height: vr.size }}>
                                  <td className="relative px-4 py-2">
                                    <span className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-gradient-to-b from-[#cd6c7a] to-[#a64953] opacity-0 transition-opacity duration-[var(--dur-quick)] group-hover:opacity-100" />
                                    <div className="flex items-center gap-2.5">
                                      <span
                                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-serif text-[12px] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] ring-1 ring-inset ring-white/60"
                                        style={{ backgroundImage: tone.bg, color: tone.fg }}
                                      >
                                        {st.name.slice(0, 1)}
                                      </span>
                                      <span className="truncate font-medium">{st.name}</span>
                                      {st.studentNo && <span className="shrink-0 text-[10px] tabular-nums text-neutral-5">#{st.studentNo}</span>}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2"><Input className="h-8 w-20 bg-white/70" type="number" defaultValue={sc?.listeningScore ?? ""} onBlur={(e) => handleScoreChange(st.id, "listening", e.target.value)} placeholder="—" /></td>
                                  <td className="px-4 py-2"><Input className="h-8 w-20 bg-white/70" type="number" defaultValue={sc?.speakingScore ?? ""} onBlur={(e) => handleScoreChange(st.id, "speaking", e.target.value)} placeholder="—" /></td>
                                  <td className="px-4 py-2"><Input className="h-8 w-20 bg-white/70" type="number" defaultValue={sc?.writtenScore ?? ""} onBlur={(e) => handleScoreChange(st.id, "written", e.target.value)} placeholder="—" /></td>
                                  <td className="px-4 py-2">
                                    {total != null ? (
                                      <span className="num-display text-[17px] font-semibold tabular-nums text-primary-d">{total}</span>
                                    ) : (
                                      <span className="text-xs text-neutral-4">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                            {padBottom > 0 && <tr style={{ height: padBottom }}><td colSpan={5} /></tr>}
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={examDialog} onClose={() => setExamDialog(false)} title="创建考试">
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>考试名称 *</Label><Input value={examForm.name} onChange={(e) => setExamForm({ ...examForm, name: e.target.value })} placeholder="如期中考试" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>考试日期</Label><Input type="date" value={examForm.examDate} onChange={(e) => setExamForm({ ...examForm, examDate: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>类型</Label><Input value={examForm.type} onChange={(e) => setExamForm({ ...examForm, type: e.target.value })} placeholder="如 阶段测试" /></div>
          </div>
          <div className="space-y-1.5"><Label>备注</Label><Input value={examForm.remark} onChange={(e) => setExamForm({ ...examForm, remark: e.target.value })} /></div>
          <Button onClick={async () => { if (!examForm.name.trim()) { toast.error("名称不能为空"); return; } await createExamMut.mutateAsync({ ...examForm, examDate: examForm.examDate || null }); }} disabled={createExamMut.isPending} className="w-full">{createExamMut.isPending ? "创建中…" : "创建"}</Button>
        </div>
      </Dialog>
    </div>
  );
}
