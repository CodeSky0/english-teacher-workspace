"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { ProgressRing } from "@/components/charts/progress-ring";
import { CountUp } from "@/components/common/count-up";
import { SegmentedBar } from "@/components/common/breakdown";
import { GlassToolbar } from "@/components/common/toolbar";
import { SectionHeader } from "@/components/common/section-header";
import { StatBar } from "@/components/common/stat-bar";
import { IconButton } from "@/components/common/icon-button";
import { Plus, Pencil, Trash2, CalendarRange, Sparkles, ChevronRight, CheckCircle2, Circle, Clock, SkipForward, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";
import { cn } from "@/lib/utils";

type Semester = { id: string; name: string; startDate: string; endDate: string; goal: string | null; totalWeeks: number | null };
type WeekPlan = { id: string; semesterId: string; weekNo: number; weekStart: string; weekEnd: string; topic: string | null; objective: string | null; content: string | null; status: "planned" | "in_progress" | "done" | "skipped" };

const STATUS_MAP: Record<string, string> = { planned: "待开始", in_progress: "进行中", done: "已完成", skipped: "已跳过" };
const STATUS_ICON: Record<string, typeof Circle> = { planned: Circle, in_progress: Clock, done: CheckCircle2, skipped: SkipForward };
const STATUS_COLOR: Record<string, string> = {
  planned: "bg-neutral-2 text-muted ring-[#cfccc4]/50",
  in_progress: "bg-[#dde7f0] text-[#3d6896] ring-[#3d6896]/25",
  done: "bg-[#dcebe2] text-[#3d7a5e] ring-[#5e9f7e]/25",
  skipped: "bg-[#f3dadb] text-[#a64953] ring-[#a64953]/20",
};
/** 状态 → 左侧色条 + 图标底纹（和色） */
const STATUS_ACCENT: Record<string, { bar: string; tile: string }> = {
  planned: { bar: "from-[#cfccc4] to-[#e6e4de]", tile: "from-[#eeece7] to-[#e5e3dc] text-neutral-6 ring-[#cfccc4]/60" },
  in_progress: { bar: "from-[#3d6896] to-[#9db6cf]", tile: "from-[#e9f0f6] to-[#dee8f0] text-[#3d6896] ring-[#3d6896]/20" },
  done: { bar: "from-[#5e9f7e] to-[#a8cbb8]", tile: "from-[#e4f0e8] to-[#d5e8dc] text-[#3d7a5e] ring-[#5e9f7e]/25" },
  skipped: { bar: "from-[#c56473] to-[#e0a3ac]", tile: "from-[#f8e4e7] to-[#f2d6da] text-primary-d ring-[#c56473]/25" },
};

const DAY_MS = 86400000;
/** "2026-09-01" → 本地零点时间戳（仅用于展示层的时间轴计算） */
function toDay(value: string): number {
  const t = new Date(value + "T00:00:00").getTime();
  return Number.isNaN(t) ? 0 : t;
}

export default function SemesterPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Semester | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", startDate: "", endDate: "", goal: "" });
  const [editingWeek, setEditingWeek] = useState<WeekPlan | null>(null);
  const [weekForm, setWeekForm] = useState({ topic: "", objective: "", content: "", status: "planned" });
  /** 当前时间（挂载后再取，避免 SSR 水合不一致） */
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // 在下一帧写入，避免水合期直接 setState 造成同步级联渲染
    const raf = requestAnimationFrame(() => setNow(Date.now()));
    return () => cancelAnimationFrame(raf);
  }, []);

  const { data: semData, isLoading } = useQuery({
    queryKey: ["semesters"],
    queryFn: () => apiClient.get<{ data: Semester[] }>("/semester/semesters"),
  });
  const semesters = semData?.data ?? [];

  const { data: weeksData } = useQuery({
    queryKey: ["week-plans", selected?.id],
    queryFn: () => apiClient.get<{ data: WeekPlan[] }>(`/semester/week-plans?semesterId=${selected?.id}`),
    enabled: !!selected,
  });
  const weeks = weeksData?.data ?? [];

  const createSemMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => apiClient.post("/semester/semesters", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["semesters"] }); toast.success("已创建"); setDialogOpen(false); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
  const deleteSemMut = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/semester/semesters/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["semesters"] }); toast.success("已删除"); setSelected(null); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
  const generateMut = useMutation({
    mutationFn: (id: string) => apiClient.post<{ data: { generated: number } }>(`/semester/semesters/${id}/generate-weeks`),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ["week-plans"] }); toast.success(`已生成 ${res.data.generated} 周计划`); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
  const updateWeekMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => apiClient.patch(`/semester/week-plans/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["week-plans"] }); toast.success("已保存"); setEditingWeek(null); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });

  function openCreate() { setForm({ name: "", startDate: "", endDate: "", goal: "" }); setDialogOpen(true); }
  function openEditWeek(w: WeekPlan) { setEditingWeek(w); setWeekForm({ topic: w.topic ?? "", objective: w.objective ?? "", content: w.content ?? "", status: w.status }); }

  async function handleCreate() {
    if (!form.name.trim() || !form.startDate || !form.endDate) { toast.error("请填写名称和日期"); return; }
    await createSemMut.mutateAsync({ name: form.name, startDate: form.startDate, endDate: form.endDate, goal: form.goal || null });
  }

  async function handleWeekSubmit() {
    if (!editingWeek) return;
    await updateWeekMut.mutateAsync({ id: editingWeek.id, data: weekForm });
  }

  function cycleStatus(w: WeekPlan) {
    const order: WeekPlan["status"][] = ["planned", "in_progress", "done", "skipped"];
    const next = order[(order.indexOf(w.status) + 1) % order.length];
    updateWeekMut.mutate({ id: w.id, data: { status: next } });
  }

  const doneCount = weeks.filter((w) => w.status === "done").length;
  const inProgressCount = weeks.filter((w) => w.status === "in_progress").length;
  const progress = weeks.length > 0 ? (doneCount / weeks.length) * 100 : 0;

  /** 学期聚合（纯展示派生，不额外请求） */
  const totalWeeks = semesters.reduce((acc, s) => acc + (s.totalWeeks ?? 0), 0);

  const weekStatusItems = [
    { label: "已完成", value: doneCount, color: "#5e9f7e" },
    { label: "进行中", value: inProgressCount, color: "#3d6896" },
    { label: "待开始", value: weeks.filter((w) => w.status === "planned").length, color: "#a8a69f" },
    { label: "已跳过", value: weeks.filter((w) => w.status === "skipped").length, color: "#c56473" },
  ];

  /** 时间轴：优先取包含今天的学期，否则第一个（纯展示派生） */
  const focusSem =
    semesters.find((s) => now != null && now >= toDay(s.startDate) && now <= toDay(s.endDate)) ?? semesters[0];
  const spanDays = focusSem ? Math.round((toDay(focusSem.endDate) - toDay(focusSem.startDate)) / DAY_MS) : 0;
  const elapsedDays =
    focusSem && now != null
      ? Math.min(Math.max(Math.round((now - toDay(focusSem.startDate)) / DAY_MS), 0), Math.max(spanDays, 0))
      : 0;
  const remainDays = focusSem && now != null ? Math.max(0, Math.ceil((toDay(focusSem.endDate) - now) / DAY_MS)) : null;
  const timePct = spanDays > 0 ? Math.round((elapsedDays / spanDays) * 100) : 0;
  const inTerm = focusSem != null && now != null && now >= toDay(focusSem.startDate) && now <= toDay(focusSem.endDate);

  const planSteps = [
    { n: "01", title: "新建学期", desc: "填写起止日期与学期目标，一学期一张封面" },
    { n: "02", title: "自动生成周计划", desc: "按周切分整学期，自动补全周次与日期区间" },
    { n: "03", title: "逐周标记状态", desc: "点击状态标签切换「待开始 / 进行中 / 已完成 / 已跳过」" },
  ];

  return (
    <div>
      <PageHeader
        title="学期规划"
        description={
          selected
            ? `${selected.name} · ${weeks.length} 周 · 进度 ${progress.toFixed(0)}%`
            : now == null
              ? " "
              : inTerm
                ? `学期进行中 · 已过 ${elapsedDays} 天 · 剩余 ${remainDays ?? 0} 天`
                : `共 ${semesters.length} 个学期`
        }
      />

      {!selected ? (
        <div>
          {/* ══════════ 概览条 ══════════ */}
          {!isLoading && semesters.length > 0 && (
            <StatBar
              items={[
                { label: "学期总数", hint: "Semesters", value: semesters.length, suffix: "个" },
                { label: "规划总周数", hint: "Planned Weeks", value: totalWeeks, suffix: "周" },
                { label: "时间进度", hint: "Elapsed", value: focusSem ? timePct : 0, suffix: "%" },
              ]}
              action={<Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" />新建学期</Button>}
            />
          )}

          {isLoading ? (
            <Card><CardContent><LoadingState /></CardContent></Card>
          ) : semesters.length === 0 ? (
            <Card><CardContent>
              <EmptyState
                icon={<CalendarRange className="h-10 w-10" />}
                title="暂无学期"
                description="新建学期后可自动生成整学期周计划，逐周标记进度"
                action={<Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" />新建学期</Button>}
              />
            </CardContent></Card>
          ) : (
            <div className="space-y-4">
              {semesters.map((s) => (
                <Card key={s.id} className="p-0">
                  <button onClick={() => setSelected(s)} className="group relative block w-full overflow-hidden rounded-xl p-5 text-left sm:p-6">
                    {/* 极光底 + 点阵 + 右缘同心圆 */}
                    <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(112deg,#fff9f9_0%,#fbf8f4_38%,#f5f7fa_72%,#f3f9f5_100%)]" />
                    <span className="pointer-events-none absolute inset-0 dot-veil opacity-[0.28]" />
                    <span className="pointer-events-none absolute -right-14 -top-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(197,100,115,0.20),transparent_66%)]" />
                    <svg className="pointer-events-none absolute -bottom-16 -right-10 hidden h-56 w-56 text-primary/[0.12] md:block" viewBox="0 0 200 200" fill="none" aria-hidden>
                      <circle cx="100" cy="100" r="92" stroke="currentColor" strokeWidth="0.5" />
                      <circle cx="100" cy="100" r="70" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 6" />
                      <circle cx="100" cy="100" r="48" stroke="currentColor" strokeWidth="0.5" />
                      <circle cx="100" cy="100" r="26" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 5" />
                      <line x1="8" y1="100" x2="192" y2="100" stroke="currentColor" strokeWidth="0.3" />
                      <line x1="100" y1="8" x2="100" y2="192" stroke="currentColor" strokeWidth="0.3" />
                    </svg>

                    <span className="relative z-[1] flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                      <span className="block min-w-0">
                        <span className="eyebrow flex items-center gap-2">
                          {s.startDate.slice(0, 4)} — {s.endDate.slice(0, 4)} · Semester
                          <span className="h-px w-8 bg-[linear-gradient(90deg,rgba(197,100,115,0.45),transparent)]" />
                        </span>
                        <span className="mt-2 block truncate font-serif text-[22px] font-semibold leading-tight tracking-tight text-text sm:text-[26px]">{s.name}</span>
                        <span className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                          <span className="inline-flex items-center gap-1.5 tabular-nums">
                            <CalendarRange className="h-3.5 w-3.5" />
                            {s.startDate} — {s.endDate}
                          </span>
                          <span className="h-3 w-px bg-line" />
                          <span className="inline-flex items-baseline gap-1">
                            <b className="num-display text-[15px] font-semibold text-text">{s.totalWeeks ?? "—"}</b>
                            <span>周</span>
                          </span>
                        </span>
                        {s.goal && <span className="mt-3 block max-w-2xl text-[13px] leading-relaxed text-neutral-7 line-clamp-2">目标 · {s.goal}</span>}
                      </span>

                      <span className="flex shrink-0 items-center gap-4">
                        <span className="hidden text-center sm:block">
                          <span className="num-display num-glaze block text-[44px] font-semibold leading-none"><CountUp value={s.totalWeeks ?? 0} /></span>
                          <span className="eyebrow mt-1.5 block">Weeks</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-[linear-gradient(180deg,#d1707f,#c56473_52%,#ac5566)] px-3.5 py-2 text-sm font-medium text-white shadow-[0_4px_12px_-4px_rgba(168,84,99,0.55),inset_0_1px_0_rgba(255,255,255,0.3)] transition-transform duration-[var(--dur-quick)] group-hover:-translate-y-[1px]">
                          查看周计划
                          <ChevronRight className="h-3.5 w-3.5 transition-transform duration-[var(--dur-quick)] group-hover:translate-x-0.5" />
                        </span>
                      </span>
                    </span>
                  </button>
                </Card>
              ))}

              {/* ══════════ 学期时间轴 + 三步规划 ══════════ */}
              {focusSem && (
                <div className="reveal grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                  <Card>
                    <SectionHeader icon={CalendarRange} title="学期时间轴" en="Timeline" tone="kuchiba"
                      right={<span className="max-w-[10rem] truncate tabular-nums">{focusSem.name}</span>} />
                    <CardContent className="pt-5">
                      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-neutral-2/80">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-[var(--dur-slow)] ease-[var(--ease-quick)]"
                          style={{
                            width: (now == null ? 0 : timePct) + "%",
                            backgroundImage: "linear-gradient(90deg,#e6b3ba,#c56473 55%,#3d6896)",
                          }}
                        />
                        {now != null && (
                          <span
                            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow-[0_0_12px_rgba(197,100,115,0.55)]"
                            style={{ left: timePct + "%" }}
                          />
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] tabular-nums text-muted">
                        <span>{focusSem.startDate}</span>
                        <span className="text-primary-d">{now == null ? "—" : "今天"}</span>
                        <span>{focusSem.endDate}</span>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {[
                          { label: "总天数", value: spanDays },
                          { label: "已过", value: elapsedDays },
                          { label: "剩余", value: remainDays ?? 0 },
                        ].map((d) => (
                          <div key={d.label} className="rounded-xl border border-line/60 bg-neutral-1/60 px-3 py-2.5">
                            <p className="text-[11px] text-muted">{d.label}</p>
                            <p className="mt-1 flex items-baseline gap-1">
                              <span className="num-display text-[22px] font-semibold leading-none text-text">
                                <CountUp value={d.value} />
                              </span>
                              <span className="text-[10px] text-muted">天</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <SectionHeader icon={Sparkles} title="三步规划学期" en="How It Works" tone="ume" />
                    <CardContent className="pt-4">
                      <ol className="space-y-3.5">
                        {planSteps.map((st) => (
                          <li key={st.n} className="group flex items-start gap-3">
                            <span className="num-display w-7 shrink-0 text-[20px] font-semibold leading-none text-primary/25 transition-colors duration-[var(--dur-quick)] group-hover:text-primary/60">{st.n}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium leading-tight text-text">{st.title}</p>
                              <p className="mt-1 text-xs leading-relaxed text-muted">{st.desc}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* ══════════ 玻璃工具条：返回 + 操作 ══════════ */}
          <GlassToolbar className="mb-0 justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
              <button onClick={() => setSelected(null)}
                className="group inline-flex items-center gap-1 rounded-full bg-panel px-2.5 py-1 text-xs text-neutral-6 ring-1 ring-inset ring-line shadow-[var(--shadow-xs)] transition-all duration-[var(--dur-quick)] hover:-translate-x-[1px] hover:text-primary-d">
                <ChevronRight className="h-3.5 w-3.5 rotate-180" />返回学期列表
              </button>
              <span className="hidden h-4 w-px bg-line sm:block" />
              <h3 className="truncate font-serif text-[17px] tracking-[0.01em]">{selected.name}</h3>
              <Badge variant="muted" className="tabular-nums">{selected.startDate} ~ {selected.endDate}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {weeks.length === 0 && <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => generateMut.mutate(selected.id)} disabled={generateMut.isPending}><Sparkles className="h-3.5 w-3.5" />自动生成周计划</Button>}
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => deleteSemMut.mutate(selected.id)}><Trash2 className="h-3.5 w-3.5" />删除学期</Button>
            </div>
          </GlassToolbar>

          {/* ══════════ 教学进度 Hero ══════════ */}
          {weeks.length > 0 && (
            <section className="reveal relative overflow-hidden rounded-2xl edge-lit spotlight shadow-[0_2px_14px_-4px_rgba(36,35,31,0.10)]">
              <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(112deg,#fdf7f7_0%,#fbf8f4_40%,#f4f7fa_74%,#f2f8f5_100%)]" />
              <span className="pointer-events-none absolute inset-0 grid-veil opacity-30" />
              <span className="pointer-events-none absolute -bottom-24 -left-16 h-60 w-60 rounded-full bg-[radial-gradient(circle,rgba(94,159,126,0.16),transparent_68%)]" />
              <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <ProgressRing value={progress} size={96} strokeWidth={8} from="#7fc0a0" to="#3d7a5e" id="semester-progress">
                    <span className="flex flex-col items-center leading-none">
                      <span className="num-display num-glaze text-[24px] font-semibold"><CountUp value={Math.round(progress)} /></span>
                      <span className="eyebrow mt-0.5 text-[8px]">done</span>
                    </span>
                  </ProgressRing>
                  <div className="min-w-0">
                    <p className="eyebrow">Teaching Progress</p>
                    <p className="mt-1 font-serif text-[17px] font-semibold text-text">教学进度</p>
                    <p className="mt-1.5 text-sm text-muted">
                      已完成 <b className="num-display text-[15px] font-semibold text-[#3d7a5e]">{doneCount}</b> / {weeks.length} 周
                    </p>
                  </div>
                </div>
                <div className="min-w-0 flex-1 sm:max-w-md">
                  <SegmentedBar items={weekStatusItems} height={10} unit=" 周" />
                </div>
              </div>
            </section>
          )}

          {/* ══════════ 周计划卡片 ══════════ */}
          {weeks.length === 0 ? (
            <Card><CardContent>
              <EmptyState
                icon={<CalendarDays className="h-10 w-10" />}
                title="还没有周计划"
                description="按学期起止日期自动切分周次，再逐周补充主题与教学目标"
                action={<Button variant="secondary" onClick={() => generateMut.mutate(selected.id)} disabled={generateMut.isPending} className="gap-1.5"><Sparkles className="h-4 w-4" />自动生成周计划</Button>}
              />
            </CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {weeks.map((w) => {
                const StatusIcon = STATUS_ICON[w.status];
                const accent = STATUS_ACCENT[w.status] ?? STATUS_ACCENT.planned;
                return (
                  <Card key={w.id} className="group">
                    <CardContent className="p-0">
                      <div className="relative flex items-start gap-3 p-4 pl-5">
                        <span className={`absolute inset-y-2 left-0 w-[3px] rounded-full bg-gradient-to-b ${accent.bar} opacity-50 transition-opacity duration-[var(--dur-quick)] group-hover:opacity-100`} />
                        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-inset ${accent.tile}`}>
                          <StatusIcon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="eyebrow">Week {String(w.weekNo).padStart(2, "0")}</span>
                            <div className="flex items-center gap-1">
                              <button onClick={() => cycleStatus(w)} title="点击切换状态"
                                className={cn("flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset transition-all duration-[var(--dur-quick)]", STATUS_COLOR[w.status])}>
                                <StatusIcon className="h-3 w-3" />{STATUS_MAP[w.status]}
                              </button>
                              <IconButton label={`编辑第 ${w.weekNo} 周计划`} onClick={() => openEditWeek(w)} className="h-8 w-8 rounded-md">
                                <Pencil className="h-3.5 w-3.5" />
                              </IconButton>
                            </div>
                          </div>
                          <p className="mt-1 text-[11px] tabular-nums text-neutral-5">{w.weekStart} ~ {w.weekEnd}</p>
                          <p className="mt-1.5 truncate font-serif text-[15px] font-semibold tracking-[0.01em]">{w.topic ?? "未填写主题"}</p>
                          {w.objective && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{w.objective}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="新建学期">
        <div className="space-y-3">
          <div className="space-y-1"><Label>学期名称 *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如 2026春季学期" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>开始日期 *</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
            <div className="space-y-1"><Label>结束日期 *</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
          </div>
          <div className="space-y-1"><Label>学期目标</Label><Textarea value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} rows={2} placeholder="如：完成 Unit 1-10，重点提升听说能力" /></div>
          <Button onClick={handleCreate} disabled={createSemMut.isPending} className="w-full">创建</Button>
        </div>
      </Dialog>

      <Dialog open={!!editingWeek} onClose={() => setEditingWeek(null)} title={`第 ${editingWeek?.weekNo} 周计划`} className="max-w-xl">
        <div className="space-y-3">
          <div className="space-y-1"><Label>本周主题</Label><Input value={weekForm.topic} onChange={(e) => setWeekForm({ ...weekForm, topic: e.target.value })} placeholder="如 Unit 3: My Family" /></div>
          <div className="space-y-1"><Label>教学目标</Label><Textarea value={weekForm.objective} onChange={(e) => setWeekForm({ ...weekForm, objective: e.target.value })} rows={2} /></div>
          <div className="space-y-1"><Label>教学内容/活动</Label><Textarea value={weekForm.content} onChange={(e) => setWeekForm({ ...weekForm, content: e.target.value })} rows={3} /></div>
          <div className="space-y-1"><Label>状态</Label>
            <select value={weekForm.status} onChange={(e) => setWeekForm({ ...weekForm, status: e.target.value })} className="flex h-9 w-full rounded-md border border-line bg-panel px-3 text-sm">
              {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <Button onClick={handleWeekSubmit} disabled={updateWeekMut.isPending} className="w-full">保存</Button>
        </div>
      </Dialog>
    </div>
  );
}
