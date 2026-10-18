"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCurrentClass } from "@/hooks/use-classes";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { downloadExport } from "@/lib/excel/client";
import {
  Shuffle, Star, CalendarCheck, MessageSquare, Download, Plus, Minus, RotateCcw, Trophy, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/error";

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
  const points = pointsData?.data ?? [];

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
  const feedbackRows = fbData?.data ?? [];

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
    setRolling(true);
    // 快速闪动若干次后定格，模拟摇号
    let ticks = 0;
    const total = 12;
    const timer = setInterval(() => {
      ticks++;
      setPicked(rollPool[Math.floor(Math.random() * rollPool.length)]);
      if (ticks >= total) {
        clearInterval(timer);
        const final = rollPool[Math.floor(Math.random() * rollPool.length)];
        setPicked(final);
        setRolling(false);
        setPickHistory((prev) => (prev.includes(final.id) ? prev : [...prev, final.id]));
      }
    }, 70);
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
        <PageHeader title="课堂互动" description="随机点名、考勤、积分与表现反馈" />
        <Card><CardContent className="py-10"><EmptyState title="请先创建班级" description="在左侧切换或新建班级后即可使用课堂工具" /></CardContent></Card>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof Shuffle }[] = [
    { key: "roll", label: "随机点名", icon: Shuffle },
    { key: "points", label: "课堂积分", icon: Star },
    { key: "attendance", label: "考勤", icon: CalendarCheck },
    { key: "feedback", label: "表现反馈", icon: MessageSquare },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="课堂互动"
        description={`${currentClass.name} · ${students.length} 名学生`}
        action={
          <Button variant="outline" className="gap-1.5" onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4" />
            {exporting ? "导出中…" : "导出课堂表现"}
          </Button>
        }
      />

      <div className="inline-flex gap-0.5 rounded-lg border border-line/70 bg-neutral-2/55 p-0.5 shadow-[inset_0_1px_2px_rgba(36,35,31,0.05)]">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-[0.4rem] px-3 py-1.5 text-sm",
                "transition-all duration-[var(--dur-quick)] ease-[var(--ease-smooth)]",
                tab === t.key
                  ? "bg-white font-medium text-primary-d shadow-[0_1px_2px_rgba(36,35,31,0.10),inset_0_1px_0_rgba(255,255,255,0.9)]"
                  : "text-muted hover:text-text"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <Card><CardContent className="py-10"><LoadingState /></CardContent></Card>
      ) : students.length === 0 ? (
        <Card><CardContent className="py-10"><EmptyState title="该班级暂无学生" description="请先在学生管理中添加或导入学生" /></CardContent></Card>
      ) : (
        <>
          {/* ------------------------------ 随机点名 ------------------------------ */}
          {tab === "roll" && (
            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>随机点名</CardTitle>
                  <CardDescription>公平抽人回答，避免总是点同一批学生</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative flex min-h-[170px] flex-col items-center justify-center overflow-hidden rounded-xl border border-line/70 bg-gradient-to-b from-white to-[#fcfbf9] px-6 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                    <div className="pointer-events-none absolute inset-0 grid-veil opacity-50" />
                    <div className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-[#3d6896]/10 blur-3xl" />
                    {picked ? (
                      <div className="relative text-center">
                        <div
                          key={picked.id}
                          className={cn(
                            "font-serif text-4xl font-semibold tracking-tight text-primary",
                            !rolling && "animate-scale-in",
                            rolling && "animate-pulse"
                          )}
                        >
                          {picked.name}
                        </div>
                        <div className="mt-2 text-sm text-muted">
                          {picked.enName ? `${picked.enName} · ` : ""}
                          {picked.seatNo != null ? `${picked.seatNo} 号` : "未排座"}
                          {picked.studentNo ? ` · ${picked.studentNo}` : ""}
                        </div>
                      </div>
                    ) : (
                      <div className="relative text-muted">点击「开始抽取」选择学生</div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button className="gap-1.5" onClick={roll} disabled={rolling}>
                      <Shuffle className="h-4 w-4" />
                      {rolling ? "抽取中…" : "开始抽取"}
                    </Button>
                    <label className="flex items-center gap-1.5 text-sm text-muted">
                      <input type="checkbox" checked={noRepeat} onChange={(e) => setNoRepeat(e.target.checked)} />
                      不重复抽取
                    </label>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={resetPicks} disabled={pickHistory.length === 0}>
                      <RotateCcw className="h-4 w-4" />重置
                    </Button>
                    {picked && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => addPointsMut.mutate({ studentId: picked.id, points: 1, reason: "课堂回答" })}
                      >
                        <Plus className="h-4 w-4" />回答加分
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted">
                    剩余可抽 {rollPool.length} 人{noRepeat && pickHistory.length ? ` · 已抽 ${pickHistory.length} 人` : ""}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>本轮抽取记录</CardTitle></CardHeader>
                <CardContent>
                  {pickHistory.length === 0 ? (
                    <p className="text-sm text-muted">还没有抽取记录</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {pickHistory.map((id, i) => {
                        const s = students.find((x) => x.id === id);
                        if (!s) return null;
                        return <Badge key={`${id}-${i}`} variant="outline">{i + 1}. {s.name}</Badge>;
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ------------------------------ 课堂积分 ------------------------------ */}
          {tab === "points" && (
            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>课堂积分</CardTitle>
                  <CardDescription>点击 +/- 快捷加减分，改动即时生效</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-line">
                    {leaderboard.map((row, idx) => (
                      <div
                        key={row.student.id}
                        className="flex items-center justify-between px-4 py-2 transition-colors duration-[var(--dur-quick)] hover:bg-gradient-to-r hover:from-[#f8e4e7]/50 hover:to-transparent"
                      >
                        <div className="flex items-center gap-2.5">
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
                          <span className="font-medium">{row.student.name}</span>
                          {row.student.seatNo != null && <span className="text-xs text-muted">{row.student.seatNo}号</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "w-12 text-right font-serif text-base font-semibold tabular-nums",
                              row.total > 0 ? "text-primary" : row.total < 0 ? "text-[#a64953]" : "text-muted"
                            )}
                          >
                            {row.total}
                          </span>
                          <button
                            onClick={() => addPointsMut.mutate({ studentId: row.student.id, points: -pointDelta, reason: pointReason || null })}
                            className="flex h-6 w-6 items-center justify-center rounded-md border border-line/70 bg-gradient-to-b from-white to-[#faf9f7] text-muted transition-colors duration-[var(--dur-quick)] hover:border-[#a64953]/40 hover:text-[#a64953]"
                            title={`扣 ${pointDelta} 分`}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => addPointsMut.mutate({ studentId: row.student.id, points: pointDelta, reason: pointReason || null })}
                            className="flex h-6 w-6 items-center justify-center rounded-md border border-line/70 bg-gradient-to-b from-white to-[#faf9f7] text-muted transition-colors duration-[var(--dur-quick)] hover:border-[#5e9f7e]/45 hover:text-[#3d7a5e]"
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
                <Card>
                  <CardHeader><CardTitle>加分设置</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted">单次分值</Label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 5].map((v) => (
                          <button
                            key={v}
                            onClick={() => setPointDelta(v)}
                            className={cn(
                              "flex-1 rounded-lg border py-1 text-sm transition-all duration-[var(--dur-quick)] ease-[var(--ease-smooth)]",
                              pointDelta === v
                                ? "border-primary/40 bg-gradient-to-b from-[#f8e4e7] to-[#f2d6da] font-medium text-primary-d shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
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

                <Card>
                  <CardHeader><CardTitle>积分排行 TOP 5</CardTitle></CardHeader>
                  <CardContent>
                    {leaderboard.slice(0, 5).every((r) => r.total === 0) ? (
                      <p className="text-sm text-muted">还没有积分记录</p>
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
                                className="absolute inset-y-0 left-0 rounded-lg bg-gradient-to-r from-[#f8e4e7] to-transparent"
                                style={{ width: `${(Math.abs(r.total) / max) * 100}%` }}
                              />
                              <span className="relative flex items-center gap-2.5">
                                <span
                                  className={cn(
                                    "flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-medium tabular-nums",
                                    i === 0
                                      ? "bg-gradient-to-b from-[#cd6c7a] to-[#a85463] text-white"
                                      : "bg-neutral-3/60 text-neutral-6"
                                  )}
                                >
                                  {i + 1}
                                </span>
                                <span className="font-medium">{r.student.name}</span>
                              </span>
                              <span className="relative font-serif text-base font-semibold tabular-nums text-primary-d">
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
            <Card>
              <CardHeader>
                <CardTitle>班级考勤</CardTitle>
                <CardDescription>选择日期后逐一标记，保存后可在导出中查看汇总</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-end gap-3">
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
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
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
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-b from-[#eeece7] to-[#e5e3dc] font-serif text-[12px] text-neutral-7 ring-1 ring-inset ring-[#cfccc4]/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
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
                                      "rounded-md border px-2 py-0.5 text-xs transition-all duration-[var(--dur-quick)] ease-[var(--ease-smooth)]",
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
              <Card>
                <CardHeader>
                  <CardTitle>记录表现</CardTitle>
                  <CardDescription>给学生打一个表现标签，便于阶段性评价</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted">学生</Label>
                    <select
                      value={fbStudentId}
                      onChange={(e) => setFbStudentId(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-line bg-panel px-3 text-sm"
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
                            "rounded-full border px-2.5 py-0.5 text-xs",
                            fbTag === t ? "border-primary bg-primary-l text-primary-d" : "border-line text-muted hover:bg-bg"
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

              <Card>
                <CardHeader>
                  <CardTitle>表现统计</CardTitle>
                  <CardDescription>按学生汇总表扬与待改进次数</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {feedbackRows.length === 0 ? (
                    <div className="p-4"><EmptyState title="还没有表现记录" /></div>
                  ) : (
                    <div className="divide-y divide-line">
                      {fbRanked.rows.map(({ student: s, stat }) => {
                        const total = stat.positive + stat.negative;
                        const posPct = (stat.positive / total) * 100;
                        return (
                          <div key={s.id} className="group relative flex items-center gap-3 px-4 py-2.5 transition-[background] duration-[var(--dur-quick)] hover:bg-gradient-to-r hover:from-[#f8e4e7]/45 hover:via-[#f8e4e7]/10 hover:to-transparent">
                            {/* 表扬 / 待改进 比例条 */}
                            <div className="pointer-events-none absolute bottom-0 left-0 h-[2px] overflow-hidden rounded-full opacity-70 transition-opacity group-hover:opacity-100"
                              style={{ width: `${(total / fbRanked.max) * 100}%` }}>
                              <div className="h-full bg-gradient-to-r from-[#5e9f7e] to-[#7fbb9c]" style={{ width: `${posPct}%` }} />
                              <div className="absolute inset-y-0 right-0 bg-gradient-to-r from-[#d99ba0] to-[#a64953]" style={{ width: `${100 - posPct}%` }} />
                            </div>
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-b from-[#eeece7] to-[#e5e3dc] font-serif text-[12px] text-neutral-7 ring-1 ring-inset ring-[#cfccc4]/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
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
                      <div className="px-4 py-3">
                        <p className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.16em] text-[#c56473]">最近记录</p>
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
    </div>
  );
}
