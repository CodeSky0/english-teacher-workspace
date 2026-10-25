"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCurrentClass } from "@/hooks/use-classes";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { ProgressRing } from "@/components/charts/progress-ring";
import { CountUp } from "@/components/common/count-up";
import { downloadExport } from "@/lib/excel/client";
import {
  Shuffle, Star, CalendarCheck, MessageSquare, Download, Plus, Minus, RotateCcw, Trophy, Loader2,
  Sparkles, Monitor, Users, Award, ArrowUpRight, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/error";

const NebulaRollCall = dynamic(
  () => import("@/components/classroom/nebula-rollcall").then((m) => m.NebulaRollCall),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[400px] items-center justify-center text-sm text-muted">
        正在准备点名动画…
      </div>
    ),
  },
);

const PollPanel = dynamic(
  () => import("@/components/classroom/poll-panel").then((m) => m.PollPanel),
  { ssr: false },
);

type BulkResult = { data?: { created?: number; updated?: number } };

type Student = { id: string; name: string; studentNo: string | null; seatNo: number | null; enName: string | null };
type PointRow = { id: string; studentId: string; points: number; reason: string | null; groupName: string | null };
type AttendanceRow = { id: string; studentId: string; status: string; remark: string | null; attendanceDate: string };
type FeedbackRow = { id: string; studentId: string; tag: string; type: "positive" | "negative"; feedbackDate: string | null; remark: string | null };

const ATTENDANCE_OPTIONS: { value: string; label: string; cls: string }[] = [
  { value: "present", label: "出勤", cls: "border-[#5e9f7e]/45 bg-gradient-to-b from-[#e4f0e8] to-[#d5e8dc] text-[#3d7a5e] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]" },
  { value: "late", label: "迟到", cls: "border-[#a87a3d]/45 bg-gradient-to-b from-[#f9f1e1] to-[#f2e7d2] text-[#8a6230] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]" },
  { value: "leave", label: "请假", cls: "border-[#3d6896]/45 bg-gradient-to-b from-[#e9f0f6] to-[#dee8f0] text-[#3d6896] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]" },
  { value: "absent", label: "缺勤", cls: "border-[#a64953]/45 bg-gradient-to-b from-[#f7dfe0] to-[#f0cfd1] text-[#a64953] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]" },
];

const POSITIVE_TAGS = ["积极发言", "听写优秀", "作业认真", "乐于助人", "进步明显"];
const NEGATIVE_TAGS = ["上课走神", "作业缺交", "听写薄弱", "扰乱纪律"];

function todayStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type Tab = "roll" | "points" | "attendance" | "feedback";

export default function ClassroomPage() {
  const { currentClass } = useCurrentClass();
  const qc = useQueryClient();
  const classId = currentClass?.id ?? "";

  const [tab, setTab] = useState<Tab>("roll");
  const [exporting, setExporting] = useState(false);

  // ---- 随机点名 ----
  const [picked, setPicked] = useState<Student | null>(null);
  const [rolling, setRolling] = useState(false);
  const [noRepeat, setNoRepeat] = useState(true);
  const [pickHistory, setPickHistory] = useState<string[]>([]);
  const rollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (rollTimerRef.current) clearInterval(rollTimerRef.current); };
  }, []);

  // ---- 考勤 ----
  const [attDate, setAttDate] = useState(todayStr());
  const [attStatus, setAttStatus] = useState<Record<string, string>>({});
  const [attRemark, setAttRemark] = useState<Record<string, string>>({});
  const [savingAtt, setSavingAtt] = useState(false);

  // ---- 积分 ----
  const [pointDelta, setPointDelta] = useState(1);
  const [pointReason, setPointReason] = useState("");

  // ---- 反馈 ----
  const [fbStudentId, setFbStudentId] = useState("");
  const [fbType, setFbType] = useState<"positive" | "negative">("positive");
  const [fbTag, setFbTag] = useState(POSITIVE_TAGS[0]);
  const [fbRemark, setFbRemark] = useState("");

  const { data: studentsData, isLoading } = useQuery({
    queryKey: ["students", classId],
    queryFn: () => apiClient.get<{ data: Student[] }>(`/students?classId=${classId}`),
    enabled: !!classId,
  });

  const students = useMemo(() => {
    const rows = studentsData?.data ?? [];
    return rows.slice().sort((a, b) => {
      const sa = a.seatNo ?? Number.MAX_SAFE_INTEGER;
      const sb = b.seatNo ?? Number.MAX_SAFE_INTEGER;
      if (sa !== sb) return sa - sb;
      return a.name.localeCompare(b.name, "zh-CN");
    });
  }, [studentsData]);

  const { data: pointsData } = useQuery({
    queryKey: ["classroom-points", classId],
    queryFn: () => apiClient.get<{ data: PointRow[] }>(`/classroom/points?classId=${classId}`),
    enabled: !!classId,
  });
  const points = useMemo(() => pointsData?.data ?? [], [pointsData]);

  const { data: attData } = useQuery({
    queryKey: ["classroom-attendance", classId, attDate],
    queryFn: () => apiClient.get<{ data: AttendanceRow[] }>(`/classroom/attendance?classId=${classId}`),
    enabled: !!classId && tab === "attendance",
  });

  const { data: fbData } = useQuery({
    queryKey: ["classroom-feedback", classId],
    queryFn: () => apiClient.get<{ data: FeedbackRow[] }>(`/classroom/feedback?classId=${classId}`),
    enabled: !!classId && tab === "feedback",
  });
  const feedbackRows = useMemo(() => fbData?.data ?? [], [fbData]);

  // 服务端考勤 -> 本地网格
  useEffect(() => {
    const status: Record<string, string> = {};
    const remark: Record<string, string> = {};
    for (const r of attData?.data ?? []) {
      if (r.attendanceDate !== attDate) continue;
      status[r.studentId] = r.status;
      if (r.remark) remark[r.studentId] = r.remark;
    }
    setAttStatus(status);
    setAttRemark(remark);
  }, [attData, attDate]);

  const pointsByStudent = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of points) m.set(p.studentId, (m.get(p.studentId) ?? 0) + (p.points ?? 0));
    return m;
  }, [points]);

  const leaderboard = useMemo(() => {
    return students
      .map((s) => ({ student: s, total: pointsByStudent.get(s.id) ?? 0 }))
      .sort((a, b) => b.total - a.total || a.student.name.localeCompare(b.student.name, "zh-CN"));
  }, [students, pointsByStudent]);

  const fbByStudent = useMemo(() => {
    const m = new Map<string, { positive: number; negative: number }>();
    for (const f of feedbackRows) {
      const cur = m.get(f.studentId) ?? { positive: 0, negative: 0 };
      if (f.type === "positive") cur.positive++;
      else cur.negative++;
      m.set(f.studentId, cur);
    }
    return m;
  }, [feedbackRows]);

  /** 表现统计榜：按记录数降序，附带用于比例条的最大值 */
  const fbRanked = useMemo(() => {
    const rows = students
      .map((s) => ({ student: s, stat: fbByStudent.get(s.id) }))
      .filter((r): r is { student: (typeof students)[number]; stat: { positive: number; negative: number } } => !!r.stat)
      .sort((a, b) => b.stat.positive + b.stat.negative - (a.stat.positive + a.stat.negative));
    const max = Math.max(1, ...rows.map((r) => r.stat.positive + r.stat.negative));
    return { rows, max };
  }, [students, fbByStudent]);

  const addPointsMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => apiClient.post("/classroom/points", { ...d, classId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["classroom-points", classId] }),
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });

  const bulkPointsMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => apiClient.post<BulkResult>("/classroom/points/bulk", { ...d, classId }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["classroom-points", classId] });
      toast.success(`已给 ${res?.data?.created ?? 0} 人加分`);
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });

  const saveAttendance = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiClient.post<BulkResult>("/classroom/attendance/bulk", payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["classroom-attendance", classId] });
      toast.success(`考勤已保存（新增 ${res?.data?.created ?? 0}，更新 ${res?.data?.updated ?? 0}）`);
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });

  const addFeedbackMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => apiClient.post("/classroom/feedback", { ...d, classId, feedbackDate: todayStr() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classroom-feedback", classId] });
      toast.success("已记录");
      setFbRemark("");
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });

  const deleteFeedbackMut = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/classroom/feedback/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["classroom-feedback", classId] }),
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });

  // ---- 随机点名 ----
  const rollPool = useMemo(() => {
    if (!noRepeat) return students;
    const rest = students.filter((s) => !pickHistory.includes(s.id));
    return rest.length ? rest : students;
  }, [students, noRepeat, pickHistory]);

  function roll() {
    if (rollPool.length === 0) {
      toast.warning("该班级暂无学生");
      return;
    }
    setPicked(rollPool[Math.floor(Math.random() * rollPool.length)]);
    setRolling(true);
    let ticks = 0;
    const total = 16;
    const timer = setInterval(() => {
      ticks++;
      setPicked(rollPool[Math.floor(Math.random() * rollPool.length)]);
      if (ticks >= total) {
        clearInterval(timer);
        rollTimerRef.current = null;
        const final = rollPool[Math.floor(Math.random() * rollPool.length)];
        setPicked(final);
        setRolling(false);
        setPickHistory((prev) => (prev.includes(final.id) ? prev : [...prev, final.id]));
      }
    }, 70);
    rollTimerRef.current = timer;
  }

  function resetPicks() {
    setPickHistory([]);
    setPicked(null);
    toast.success("已重置抽取记录");
  }

  async function handleSaveAttendance() {
    if (!classId) return;
    setSavingAtt(true);
    try {
      await saveAttendance.mutateAsync({
        classId,
        attendanceDate: attDate,
        items: students.map((s) => ({
          studentId: s.id,
          status: attStatus[s.id] ?? "present",
          remark: attRemark[s.id]?.trim() || null,
        })),
      });
    } finally {
      setSavingAtt(false);
    }
  }

  function markAllPresent() {
    const next: Record<string, string> = {};
    for (const s of students) next[s.id] = "present";
    setAttStatus(next);
  }

  async function handleExport() {
    if (!classId) return;
    setExporting(true);
    try {
      await downloadExport(`/export/classroom?classId=${classId}`, `课堂表现_${todayStr()}.xlsx`);
      toast.success("已导出课堂表现");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "导出失败"));
    } finally {
      setExporting(false);
    }
  }

  if (!currentClass) {
    return (
      <div>
        <PageHeader title="课堂互动" eyebrow="Classroom Studio" description="随机点名、考勤、积分与表现反馈" />
        <Card><CardContent className="py-10"><EmptyState title="请先创建班级" description="在左侧切换或新建班级后即可使用课堂工具" /></CardContent></Card>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; en: string; icon: typeof Shuffle }[] = [
    { key: "roll", label: "随机点名", en: "Roll Call", icon: Shuffle },
    { key: "points", label: "课堂积分", en: "Points", icon: Star },
    { key: "attendance", label: "考勤", en: "Attendance", icon: CalendarCheck },
    { key: "feedback", label: "表现反馈", en: "Feedback", icon: MessageSquare },
  ];

  const totalPoints = points.reduce((sum, p) => sum + (p.points ?? 0), 0);
  const pickedCount = pickHistory.length;
  const pickedPct = students.length ? Math.round((pickedCount / students.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* ══════════ Hero：墨色极光 · 课堂工具台 ══════════ */}
      <section className="spotlight relative overflow-hidden rounded-[26px] shadow-[0_2px_4px_rgba(36,35,31,0.06),0_30px_64px_-30px_rgba(74,32,44,0.62)] animate-fade-in-up">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,#45202c_0%,#643040_16%,#8a4a52_32%,#8d5f60_48%,#6b5a7c_66%,#3f5878_84%,#2d4761_100%)]" />
        <div className="pointer-events-none absolute -left-24 -top-32 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(255,170,150,0.42),transparent_62%)]" />
        <div className="pointer-events-none absolute -right-24 -top-32 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(126,172,255,0.32),transparent_64%)]" />
        <div className="pointer-events-none absolute -bottom-56 left-1/3 h-[26rem] w-[34rem] rounded-full bg-[radial-gradient(ellipse,rgba(120,220,190,0.22),transparent_68%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.09] grid-veil" />
        <svg
          className="pointer-events-none absolute -right-12 top-1/2 hidden h-[21rem] w-[21rem] -translate-y-1/2 text-white/20 lg:block animate-drift"
          viewBox="0 0 200 200"
          fill="none"
          aria-hidden
        >
          <circle cx="100" cy="100" r="92" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="100" cy="100" r="72" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 6" />
          <circle cx="100" cy="100" r="52" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="100" cy="100" r="30" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 5" />
          <line x1="8" y1="100" x2="192" y2="100" stroke="currentColor" strokeWidth="0.3" />
          <line x1="100" y1="8" x2="100" y2="192" stroke="currentColor" strokeWidth="0.3" />
        </svg>
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-8 right-2 hidden select-none font-display text-[8rem] font-semibold leading-none tracking-tight text-white/[0.06] lg:block"
        >
          Classroom
        </span>

        <div className="relative flex flex-col gap-7 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="eyebrow text-white/55">Classroom Studio</span>
              <span className="h-3 w-px bg-white/25" />
              <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] text-white/85 backdrop-blur-sm">
                <Sparkles className="h-3 w-3" />
                互动工具台
              </span>
            </div>

            <h2 className="mt-3 max-w-2xl font-serif text-[30px] font-semibold leading-[1.16] tracking-tight text-white sm:text-[36px] lg:text-[40px]">
              让每一次提问，
              <span className="bg-[linear-gradient(100deg,#ffe9d8_0%,#ffc9c4_38%,#dcc9ff_70%,#bfe4ff_100%)] bg-clip-text text-transparent">
                都有回响。
              </span>
            </h2>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-sm text-white/75">
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-white/50" />
                {currentClass.name}
              </span>
              <span className="h-3.5 w-px bg-white/20" />
              <span className="inline-flex items-baseline gap-1.5">
                <b className="num-display text-[19px] font-semibold leading-none text-white">{students.length}</b> 名学生
              </span>
              <span className="h-3.5 w-px bg-white/20" />
              <span className="inline-flex items-baseline gap-1.5">
                <b className="num-display text-[19px] font-semibold leading-none text-white">{totalPoints}</b> 全班积分
              </span>
              <span className="h-3.5 w-px bg-white/20" />
              <span className="inline-flex items-baseline gap-1.5">
                <b className="num-display text-[19px] font-semibold leading-none text-white">{pickedCount}</b> 本轮已点
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <Button
                size="sm"
                className="gap-1.5 border border-white/30 bg-white text-[#4a2231] shadow-[0_6px_18px_-8px_rgba(0,0,0,0.5)] hover:bg-white/92"
                onClick={handleExport}
                disabled={exporting}
              >
                <Download className="h-4 w-4" />
                {exporting ? "导出中…" : "导出课堂表现"}
              </Button>
              <Link
                href="/classroom"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 text-xs font-medium text-white shadow-none backdrop-blur-sm transition-all duration-[var(--dur-quick)] hover:border-white/45 hover:bg-white/20"
              >
                <Monitor className="h-4 w-4" />
                大屏模式
                <ArrowUpRight className="h-3.5 w-3.5 opacity-80" />
              </Link>
            </div>
          </div>

          {/* 右：本轮点名进度（玻璃卡浮在墨色极光上） */}
          <div className="relative shrink-0">
            <div className="flex items-center gap-4 rounded-2xl border border-white/25 bg-white/[0.12] px-4 py-3.5 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-xl sm:px-5">
              <ProgressRing value={pickedPct} size={100} strokeWidth={8} from="#ffd9c0" to="#a9c8ff" trackColor="rgba(255,255,255,0.16)" id="hero-picked">
                <div className="text-center leading-none">
                  <div className="num-display text-[26px] font-semibold text-white">
                    <CountUp value={pickedCount} />
                  </div>
                  <div className="eyebrow mt-1 text-[8px] text-white/50">picked</div>
                </div>
              </ProgressRing>
              <div className="min-w-0">
                <p className="eyebrow text-white/50">This Round</p>
                <p className="mt-1 text-[13px] font-medium text-white/90">本轮点名进度</p>
                <p className="mt-1 text-[11px] text-white/55">
                  已抽 <b className="tabular-nums text-white/90">{pickedCount}</b> / 剩余 <b className="tabular-nums text-white/90">{rollPool.length}</b> 人
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-white/55">
                  <span className={cn("h-1.5 w-1.5 rounded-full", noRepeat ? "bg-[#a5d3b6]" : "bg-[#e0bd84]")} />
                  <span className="text-[10px]">{noRepeat ? "不重复抽取" : "可重复抽取"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 工具切换：深色区里的四枚大按钮 */}
        <div className="relative grid grid-cols-2 gap-2.5 border-t border-white/10 p-4 sm:grid-cols-4 sm:p-5">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                aria-pressed={isActive}
                className={cn(
                  "group flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left",
                  "transition-all duration-[var(--dur-smooth)] ease-[var(--ease-smooth)]",
                  isActive
                    ? "border-white/45 bg-white/[0.16] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_24px_-18px_rgba(0,0,0,0.9)]"
                    : "border-white/12 bg-white/[0.05] hover:border-white/30 hover:bg-white/[0.10]"
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] ring-1 ring-inset transition-transform duration-[var(--dur-quick)] group-hover:scale-105",
                    isActive ? "bg-white text-[#4a2231] ring-white/60" : "bg-white/10 text-white/85 ring-white/20"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className={cn("block text-[13.5px] font-medium leading-tight", isActive ? "text-white" : "text-white/80")}>{t.label}</span>
                  <span className="mt-0.5 block text-[9px] uppercase tracking-[0.18em] text-white/40">{t.en}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>


      {isLoading ? (
        <Card><CardContent className="py-10"><LoadingState /></CardContent></Card>
      ) : students.length === 0 ? (
        <Card><CardContent className="py-10"><EmptyState title="该班级暂无学生" description="请先在学生管理中添加或导入学生" /></CardContent></Card>
      ) : (
        <>
          {/* ------------------------------ 随机点名 ------------------------------ */}
          {tab === "roll" && (
            <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <p className="eyebrow">Roll Call</p>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <CardTitle className="flex items-center gap-2.5 text-[17px]">
                      <span className="icon-slot"><Shuffle /></span>
                      随机点名
                    </CardTitle>
                    <span className="text-[11px] text-muted">公平抽人回答</span>
                  </div>
                  <CardDescription>公平抽人回答，避免总是点同一批学生</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <NebulaRollCall
                      picked={picked}
                      rolling={rolling}
                      className="rounded-2xl border border-line/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_10px_-3px_rgba(36,35,31,0.10)]"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button className="gap-1.5" onClick={roll} disabled={rolling}>
                      <Shuffle className="h-4 w-4" />
                      {rolling ? "抽取中…" : "开始抽取"}
                    </Button>
                    <label className="flex items-center gap-1.5 rounded-lg bg-neutral-2/60 px-2.5 py-1.5 text-[12px] text-neutral-7">
                      <input type="checkbox" checked={noRepeat} onChange={(e) => setNoRepeat(e.target.checked)} className="accent-[#c56473]" />
                      不重复抽取
                    </label>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={resetPicks} disabled={pickHistory.length === 0}>
                      <RotateCcw className="h-4 w-4" />重置
                    </Button>
                    {picked && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="gap-1.5"
                        disabled={addPointsMut.isPending}
                        onClick={() =>
                          addPointsMut.mutate(
                            { studentId: picked.id, points: 1, reason: "课堂回答" },
                            { onSuccess: () => toast.success(`已为 ${picked.name} +1 分`) },
                          )
                        }
                      >
                        {addPointsMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        为 {picked.name} 加分
                      </Button>
                    )}
                  </div>
                  <p className="flex items-center gap-1.5 text-[11px] text-muted">
                    <span className={cn("h-1.5 w-1.5 rounded-full", noRepeat ? "bg-[#5e9f7e]" : "bg-[#a87a3d]")} />
                    剩余可抽 <b className="tabular-nums text-text">{rollPool.length}</b> 人
                    {noRepeat && pickHistory.length ? ` · 已抽 ${pickHistory.length} 人` : ""}
                  </p>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <p className="eyebrow">History</p>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <CardTitle className="flex items-center gap-2.5 text-[17px]">
                      <span className="icon-slot"><Award /></span>
                      本轮抽取记录
                    </CardTitle>
                    <span className="rounded-full bg-white/70 px-2 py-0.5 font-display text-[11px] tabular-nums text-neutral-6 ring-1 ring-inset ring-line/70">
                      {pickedCount} / {students.length}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {pickHistory.length === 0 ? (
                    <div className="relative overflow-hidden rounded-xl border border-dashed border-line/80 bg-[linear-gradient(165deg,rgba(255,255,255,0.6),rgba(250,248,244,0.5))] px-4 py-9 text-center">
                      <div className="pointer-events-none absolute inset-0 grid-veil opacity-35" />
                      <div className="relative mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-b from-[#f8e4e7] to-[#f2d6da] text-[#a64953] ring-1 ring-inset ring-[#c56473]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                        <Shuffle className="h-5 w-5" />
                      </div>
                      <p className="relative text-sm font-medium text-text">还没有抽取记录</p>
                      <p className="relative mt-1 text-xs text-muted">点击左侧「开始抽取」，或按空格键</p>
                    </div>
                  ) : (
                    <ol className="relative space-y-1.5 pl-4">
                      <span className="pointer-events-none absolute bottom-2 left-[5px] top-2 w-px bg-[linear-gradient(180deg,rgba(197,100,115,0.4),rgba(197,100,115,0.08))]" />
                      {pickHistory.map((id, i) => {
                        const s = students.find((x) => x.id === id);
                        if (!s) return null;
                        return (
                          <li key={`${id}-${i}`} className="relative flex items-center gap-2.5 rounded-lg px-1 py-1.5 transition-colors duration-[var(--dur-quick)] hover:bg-[linear-gradient(90deg,rgba(248,228,231,0.45),transparent)]">
                            <span className="absolute -left-[10px] top-1/2 flex h-2 w-2 -translate-y-1/2 items-center justify-center rounded-full bg-[linear-gradient(180deg,#d97787,#a64953)] shadow-[0_0_0_3px_rgba(255,255,255,0.9)]" />
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[linear-gradient(180deg,#f2f1ed,#eae8e2)] font-display text-[11px] font-semibold text-neutral-6 ring-1 ring-inset ring-line/60">
                              {i + 1}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text">{s.name}</span>
                            {s.seatNo != null && <span className="shrink-0 text-[10px] tabular-nums text-neutral-5">{s.seatNo} 号</span>}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ------------------------------ 课堂积分 ------------------------------ */}
          {tab === "points" && (
            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <p className="eyebrow">Leaderboard</p>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <CardTitle className="flex items-center gap-2.5 text-[17px]">
                      <span className="icon-slot"><Star /></span>
                      课堂积分
                    </CardTitle>
                    <span className="text-[11px] text-muted">点击 +/- 快捷加减分</span>
                  </div>
                  <CardDescription>点击 +/- 快捷加减分，改动即时生效</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[32rem] divide-y divide-line/70 overflow-y-auto scrollbar-thin">
                    {leaderboard.map((row, idx) => (
                      <div
                        key={row.student.id}
                        className="flex items-center justify-between gap-2 px-4 py-2 transition-colors duration-[var(--dur-quick)] hover:bg-[linear-gradient(90deg,rgba(248,228,231,0.5),transparent_72%)]"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          {/* 前三名用梅色徽标，其余为中性序号 */}
                          <span
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-medium tabular-nums",
                              idx < 3
                                ? "bg-gradient-to-b from-[#f8e4e7] to-[#f2d6da] text-primary-d ring-1 ring-inset ring-primary/20"
                                : "bg-neutral-3/55 text-neutral-6"
                            )}
                          >
                            {idx + 1}
                          </span>
                          <span className="truncate font-medium">{row.student.name}</span>
                          {row.student.seatNo != null && <span className="shrink-0 text-[11px] text-muted">{row.student.seatNo}号</span>}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={cn(
                              "w-12 text-right font-display text-[17px] font-semibold tabular-nums",
                              row.total > 0 ? "text-primary" : row.total < 0 ? "text-[#a64953]" : "text-muted"
                            )}
                          >
                            {row.total}
                          </span>
                          <button
                            onClick={() => addPointsMut.mutate({ studentId: row.student.id, points: -pointDelta, reason: pointReason || null })}
                            disabled={addPointsMut.isPending}
                            aria-label={`扣 ${pointDelta} 分`}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-line/70 bg-gradient-to-b from-white to-[#faf9f7] text-muted transition-all duration-[var(--dur-quick)] hover:-translate-y-[1px] hover:border-[#a64953]/40 hover:text-[#a64953] disabled:cursor-not-allowed disabled:opacity-50"
                            title={`扣 ${pointDelta} 分`}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => addPointsMut.mutate({ studentId: row.student.id, points: pointDelta, reason: pointReason || null })}
                            disabled={addPointsMut.isPending}
                            aria-label={`加 ${pointDelta} 分`}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-line/70 bg-gradient-to-b from-white to-[#faf9f7] text-muted transition-all duration-[var(--dur-quick)] hover:-translate-y-[1px] hover:border-[#5e9f7e]/45 hover:text-[#3d7a5e] disabled:cursor-not-allowed disabled:opacity-50"
                            title={`加 ${pointDelta} 分`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card className="glaze overflow-hidden">
                  <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(168,122,61,0.14),transparent_68%)]" />
                  <CardHeader className="pb-2">
                    <p className="eyebrow">Quick Add</p>
                    <CardTitle className="mt-1.5 flex items-center gap-2.5 text-[17px]">
                      <span className="icon-slot"><Trophy /></span>
                      加分设置
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted">单次分值</Label>
                      <div className="grid grid-cols-4 gap-1">
                        {[1, 2, 3, 5].map((v) => (
                          <button
                            key={v}
                            onClick={() => setPointDelta(v)}
                            className={cn(
                              "rounded-lg border py-1.5 font-display text-sm tabular-nums transition-all duration-[var(--dur-quick)] ease-[var(--ease-smooth)]",
                              pointDelta === v
                                ? "border-primary/40 bg-gradient-to-b from-[#f8e4e7] to-[#f2d6da] font-semibold text-primary-d shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                                : "border-line bg-gradient-to-b from-white to-[#faf9f7] text-muted hover:border-neutral-4 hover:text-text"
                            )}
                          >
                            {v} 分
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted">事由（可选）</Label>
                      <Input value={pointReason} onChange={(e) => setPointReason(e.target.value)} placeholder="如：小组展示优秀" />
                    </div>
                    <Button
                      variant="outline"
                      className="w-full gap-1.5"
                      disabled={bulkPointsMut.isPending}
                      onClick={() => bulkPointsMut.mutate({ studentIds: students.map((s) => s.id), points: pointDelta, reason: pointReason || "全班奖励" })}
                    >
                      <Trophy className="h-4 w-4" />全班统一加 {pointDelta} 分
                    </Button>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <p className="eyebrow">Top 5</p>
                    <CardTitle className="mt-1.5 flex items-center gap-2.5 text-[17px]">
                      <span className="icon-slot"><TrendingUp /></span>
                      积分排行 TOP 5
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {leaderboard.slice(0, 5).every((r) => r.total === 0) ? (
                      <p className="py-6 text-center text-sm text-muted">还没有积分记录</p>
                    ) : (
                      <div className="space-y-1.5">
                        {(() => {
                          const top = leaderboard.slice(0, 5);
                          const max = Math.max(1, ...top.map((r) => Math.abs(r.total)));
                          return top.map((r, i) => (
                            <div
                              key={r.student.id}
                              className="relative flex items-center justify-between overflow-hidden rounded-lg px-2 py-1.5 text-sm"
                            >
                              {/* 条形背景按分值占比延伸，一眼看出差距 */}
                              <div
                                className="absolute inset-y-0 left-0 rounded-lg bg-[linear-gradient(90deg,rgba(248,228,231,0.95),rgba(248,228,231,0.2))]"
                                style={{ width: `${(Math.abs(r.total) / max) * 100}%` }}
                              />
                              <span className="relative flex items-center gap-2.5">
                                <span
                                  className={cn(
                                    "flex h-5 w-5 shrink-0 items-center justify-center rounded font-display text-[10px] font-semibold tabular-nums",
                                    i === 0
                                      ? "bg-gradient-to-b from-[#cd6c7a] to-[#a85463] text-white shadow-[0_2px_6px_-2px_rgba(168,84,99,0.7)]"
                                      : "bg-neutral-3/60 text-neutral-6"
                                  )}
                                >
                                  {i + 1}
                                </span>
                                <span className="truncate font-medium">{r.student.name}</span>
                              </span>
                              <span className="relative font-display text-[16px] font-semibold tabular-nums text-primary-d">
                                {r.total}
                              </span>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ------------------------------ 考勤 ------------------------------ */}
          {tab === "attendance" && (
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <p className="eyebrow">Attendance</p>
                <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
                  <CardTitle className="flex items-center gap-2.5 text-[17px]">
                    <span className="icon-slot"><CalendarCheck /></span>
                    班级考勤
                  </CardTitle>
                  <span className="text-[11px] text-muted">保存后可在导出中查看汇总</span>
                </div>
                <CardDescription>选择日期后逐一标记，保存后可在导出中查看汇总</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-end gap-3 rounded-xl border border-white/70 bg-white/50 p-2.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted">日期</Label>
                    <Input type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)} className="h-9 w-44" />
                  </div>
                  <Button variant="outline" size="sm" onClick={markAllPresent}>全部出勤</Button>
                  <Button size="sm" className="gap-1.5" onClick={handleSaveAttendance} disabled={savingAtt}>
                    {savingAtt ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
                    保存考勤
                  </Button>
                </div>
                <div className="overflow-x-auto rounded-xl border border-line/60">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0">
                      <tr className="table-head border-b border-line text-left text-xs text-muted">
                        <th className="px-3 py-2.5 font-medium">学生</th>
                        <th className="px-3 py-2.5 font-medium">状态</th>
                        <th className="px-3 py-2.5 font-medium">备注</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => {
                        const cur = attStatus[s.id] ?? "present";
                        return (
                          <tr key={s.id} className="group border-b border-line/50 transition-[background] duration-[var(--dur-quick)] hover:bg-gradient-to-r hover:from-[#f8e4e7]/45 hover:via-[#f8e4e7]/10 hover:to-transparent">
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2.5">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-[#eeece7] to-[#e5e3dc] font-serif text-[12px] text-neutral-7 ring-1 ring-inset ring-[#cfccc4]/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                                  {s.name.slice(0, 1)}
                                </span>
                                <span className="font-medium tracking-[0.01em]">{s.name}</span>
                                {s.seatNo != null && <span className="rounded bg-neutral-2 px-1.5 py-[1px] text-[11px] tabular-nums text-muted">{s.seatNo}号</span>}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex gap-1">
                                {ATTENDANCE_OPTIONS.map((opt) => (
                                  <button
                                    key={opt.value}
                                    onClick={() => setAttStatus({ ...attStatus, [s.id]: opt.value })}
                                    className={cn(
                                      "min-h-[36px] rounded-md border px-2.5 py-1 text-xs transition-all duration-[var(--dur-quick)] ease-[var(--ease-smooth)]",
                                      cur === opt.value
                                        ? cn(opt.cls, "shadow-[0_1px_2px_rgba(36,35,31,0.10),inset_0_1px_0_rgba(255,255,255,0.9)]")
                                        : "border-line bg-panel text-muted hover:-translate-y-[1px] hover:bg-neutral-2 hover:text-text hover:shadow-[var(--shadow-xs)]"
                                    )}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                value={attRemark[s.id] ?? ""}
                                onChange={(e) => setAttRemark({ ...attRemark, [s.id]: e.target.value })}
                                placeholder="可选"
                                className="h-8"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ------------------------------ 表现反馈 ------------------------------ */}
          {tab === "feedback" && (
            <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <p className="eyebrow">Record</p>
                  <CardTitle className="mt-1.5 flex items-center gap-2.5 text-[17px]">
                    <span className="icon-slot"><MessageSquare /></span>
                    记录表现
                  </CardTitle>
                  <CardDescription>给学生打一个表现标签，便于阶段性评价</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted">学生</Label>
                    <select
                      value={fbStudentId}
                      onChange={(e) => setFbStudentId(e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-line bg-gradient-to-b from-white to-[#faf9f7] px-3 text-sm shadow-[inset_0_1px_2px_rgba(36,35,31,0.045)] focus-visible:outline-none focus-visible:border-primary/55"
                    >
                      <option value="">请选择学生</option>
                      {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted">类型</Label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setFbType("positive"); setFbTag(POSITIVE_TAGS[0]); }}
                        className={cn(
                          "flex-1 rounded-lg border py-1 text-sm transition-all duration-[var(--dur-quick)] ease-[var(--ease-smooth)]",
                          fbType === "positive"
                            ? "border-[#5e9f7e]/45 bg-gradient-to-b from-[#e4f0e8] to-[#d5e8dc] font-medium text-[#3d7a5e] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
                            : "border-line bg-gradient-to-b from-white to-[#faf9f7] text-muted hover:border-neutral-4 hover:text-text"
                        )}
                      >
                        表扬
                      </button>
                      <button
                        onClick={() => { setFbType("negative"); setFbTag(NEGATIVE_TAGS[0]); }}
                        className={cn(
                          "flex-1 rounded-lg border py-1 text-sm transition-all duration-[var(--dur-quick)] ease-[var(--ease-smooth)]",
                          fbType === "negative"
                            ? "border-[#a64953]/45 bg-gradient-to-b from-[#f7dfe0] to-[#f0cfd1] font-medium text-[#a64953] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
                            : "border-line bg-gradient-to-b from-white to-[#faf9f7] text-muted hover:border-neutral-4 hover:text-text"
                        )}
                      >
                        待改进
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted">标签</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {(fbType === "positive" ? POSITIVE_TAGS : NEGATIVE_TAGS).map((t) => (
                        <button
                          key={t}
                          onClick={() => setFbTag(t)}
                          className={cn(
                            "rounded-full border px-2.5 py-0.5 text-xs transition-all duration-[var(--dur-quick)]",
                            fbTag === t
                              ? "border-primary bg-primary-l text-primary-d shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                              : "border-line text-muted hover:-translate-y-[1px] hover:border-neutral-4 hover:text-text"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted">补充说明（可选）</Label>
                    <Input value={fbRemark} onChange={(e) => setFbRemark(e.target.value)} placeholder="如：Unit 2 单词掌握扎实" />
                  </div>
                  <Button
                    className="w-full"
                    disabled={!fbStudentId || addFeedbackMut.isPending}
                    onClick={() => addFeedbackMut.mutate({ studentId: fbStudentId, tag: fbTag, type: fbType, remark: fbRemark || null })}
                  >
                    记录
                  </Button>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <p className="eyebrow">Overview</p>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <CardTitle className="flex items-center gap-2.5 text-[17px]">
                      <span className="icon-slot"><TrendingUp /></span>
                      表现统计
                    </CardTitle>
                    <span className="text-[11px] text-muted">按学生汇总</span>
                  </div>
                  <CardDescription>按学生汇总表扬与待改进次数</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {feedbackRows.length === 0 ? (
                    <div className="p-4"><EmptyState title="还没有表现记录" /></div>
                  ) : (
                    <div className="divide-y divide-line/70">
                      <div className="max-h-[26rem] overflow-y-auto scrollbar-thin">
                        {fbRanked.rows.map(({ student: s, stat }) => {
                          const total = stat.positive + stat.negative;
                          const posPct = (stat.positive / total) * 100;
                          return (
                            <div key={s.id} className="group relative flex items-center gap-3 px-4 pb-3 pt-2.5 transition-[background] duration-[var(--dur-quick)] hover:bg-gradient-to-r hover:from-[#f8e4e7]/45 hover:via-[#f8e4e7]/10 hover:to-transparent">
                              {/* 表扬 / 待改进 比例条：轨道 + 胶囊 */}
                              <div className="pointer-events-none absolute inset-x-4 bottom-1.5 h-[3px] overflow-hidden rounded-full bg-neutral-3/35">
                                <div className="relative h-full overflow-hidden rounded-full opacity-80 transition-opacity group-hover:opacity-100" style={{ width: `${(total / fbRanked.max) * 100}%` }}>
                                  <div className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#5e9f7e,#8cc7a7)]" style={{ width: `${posPct}%` }} />
                                  <div className="absolute inset-y-0 right-0 rounded-full bg-[linear-gradient(90deg,#d99ba0,#a64953)]" style={{ width: `${100 - posPct}%` }} />
                                </div>
                              </div>

                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-[#eeece7] to-[#e5e3dc] font-serif text-[12px] text-neutral-7 ring-1 ring-inset ring-[#cfccc4]/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                                {s.name.slice(0, 1)}
                              </span>
                              <span className="min-w-0 flex-1 truncate font-medium tracking-[0.01em]">{s.name}</span>
                              <div className="flex items-center gap-1.5 text-xs">
                                {stat.positive > 0 && <Badge>表扬 {stat.positive}</Badge>}
                                {stat.negative > 0 && <Badge variant="outline" className="border-[#a64953]/45 text-[#a64953]">待改进 {stat.negative}</Badge>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="px-4 py-3">
                        <p className="mb-2.5 eyebrow text-[#b8556a]/80">Recent</p>
                        <div className="space-y-0.5">
                          {feedbackRows.slice().reverse().slice(0, 8).map((f) => {
                            const s = students.find((x) => x.id === f.studentId);
                            const good = f.type === "positive";
                            return (
                              <div key={f.id} className="group flex items-center gap-2.5 rounded-md px-1.5 py-1 text-xs transition-colors duration-[var(--dur-quick)] hover:bg-neutral-2/60">
                                {/* 时间轴圆点 */}
                                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${good ? "bg-[#5e9f7e]" : "bg-[#a64953]"} shadow-[0_0_0_2px_rgba(255,255,255,0.9)]`} />
                                <span className="min-w-0 flex-1 truncate text-neutral-7">
                                  <span className="font-medium">{s?.name ?? "已删除"}</span>
                                  <span className="text-[#c9c6bd]"> · </span>
                                  <span className={good ? "text-[#3d7a5e]" : "text-[#a64953]"}>{f.tag}</span>
                                  {f.remark ? <span className="text-muted"> · {f.remark}</span> : null}
                                </span>
                                <span className="shrink-0 tabular-nums text-muted">{f.feedbackDate ?? ""}</span>
                                <button onClick={() => deleteFeedbackMut.mutate(f.id)}
                                  className="shrink-0 rounded px-1 text-muted opacity-0 transition-all duration-[var(--dur-quick)] hover:text-[#a64953] group-hover:opacity-100">删除</button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      <div className="pt-1">
        <PollPanel classId={currentClass.id} />
      </div>
    </div>
  );
}
