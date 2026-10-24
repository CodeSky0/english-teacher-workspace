"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { Plus, Trash2, CalendarRange, Sparkles, ChevronRight, CheckCircle2, Circle, Clock, SkipForward } from "lucide-react";
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

export default function SemesterPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Semester | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", startDate: "", endDate: "", goal: "" });
  const [editingWeek, setEditingWeek] = useState<WeekPlan | null>(null);
  const [weekForm, setWeekForm] = useState({ topic: "", objective: "", content: "", status: "planned" });

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
  const progress = weeks.length > 0 ? (doneCount / weeks.length) * 100 : 0;

  return (
    <div>
      <PageHeader title="学期规划" description={selected ? `${selected.name} · ${weeks.length} 周 · 进度 ${progress.toFixed(0)}%` : `共 ${semesters.length} 个学期`}
        action={!selected && <Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" />新建学期</Button>} />

      {!selected ? (
        <Card><CardContent className="p-0">
          {isLoading ? <LoadingState /> : semesters.length === 0 ? <EmptyState icon={<CalendarRange className="h-10 w-10" />} title="暂无学期" description="新建学期后可自动生成周计划" /> :
            <div className="divide-y divide-line">
              {semesters.map((s) => (
                <button key={s.id} onClick={() => setSelected(s)}
                  className="group flex w-full items-center gap-3.5 p-4 pl-5 text-left transition-[background] duration-[var(--dur-quick)] hover:bg-gradient-to-r hover:from-[#f8e4e7]/55 hover:via-[#f8e4e7]/12 hover:to-transparent">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.5rem] bg-gradient-to-b from-[#e9f0f6] to-[#dee8f0] text-[#3d6896] ring-1 ring-inset ring-[#3d6896]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                    <CalendarRange className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium tracking-[0.01em]">{s.name}</span>
                    <span className="mt-0.5 block text-xs text-muted">{s.startDate} ~ {s.endDate} · {s.totalWeeks ?? "?"} 周</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform duration-[var(--dur-quick)] group-hover:translate-x-0.5 group-hover:text-primary" />
                </button>
              ))}
            </div>}
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <button onClick={() => setSelected(null)}
                className="group inline-flex items-center gap-1 rounded-full bg-panel px-2.5 py-1 text-xs text-neutral-6 ring-1 ring-inset ring-line shadow-[var(--shadow-xs)] transition-all duration-[var(--dur-quick)] hover:-translate-x-[1px] hover:text-primary-d">
                <ChevronRight className="h-3.5 w-3.5 rotate-180" />返回学期列表
              </button>
              <h3 className="font-serif text-[17px] tracking-[0.01em]">{selected.name}</h3>
              <Badge variant="muted">{selected.startDate} ~ {selected.endDate}</Badge>
            </div>
            <div className="flex gap-2">
              {weeks.length === 0 && <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => generateMut.mutate(selected.id)} disabled={generateMut.isPending}><Sparkles className="h-3.5 w-3.5" />自动生成周计划</Button>}
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => deleteSemMut.mutate(selected.id)}><Trash2 className="h-3.5 w-3.5" />删除学期</Button>
            </div>
          </div>

          {weeks.length > 0 && (
            <Card>
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">教学进度</span>
                  <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-neutral-2">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#5e9f7e] to-[#3d7a5e] transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-[#3d7a5e]">{progress.toFixed(0)}%</span>
                  <span className="text-xs text-muted">{doneCount}/{weeks.length} 周</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {weeks.map((w) => {
              const StatusIcon = STATUS_ICON[w.status];
              return (
                <Card key={w.id} className="transition-all duration-[var(--dur-quick)] hover:shadow-[var(--shadow-md)]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <button onClick={() => cycleStatus(w)} className={cn("flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-all", STATUS_COLOR[w.status])}>
                        <StatusIcon className="h-3.5 w-3.5" />第 {w.weekNo} 周 · {STATUS_MAP[w.status]}
                      </button>
                      <button onClick={() => openEditWeek(w)} className="rounded-md p-1 text-muted transition-colors hover:bg-neutral-2 hover:text-primary"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <p className="mt-2 text-xs tabular-nums text-muted">{w.weekStart} ~ {w.weekEnd}</p>
                    {w.topic && <p className="mt-1.5 font-medium">{w.topic}</p>}
                    {w.objective && <p className="mt-1 text-sm text-muted">{w.objective}</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
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
