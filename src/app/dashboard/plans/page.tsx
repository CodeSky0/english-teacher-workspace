"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCurrentClass, useClasses } from "@/hooks/use-classes";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { CountUp } from "@/components/common/count-up";
import { StatBar } from "@/components/common/stat-bar";
import { SegmentedBar } from "@/components/common/breakdown";
import { SectionHeader } from "@/components/common/section-header";
import { IconButton } from "@/components/common/icon-button";
import { NextStepCard } from "@/components/common/next-step";
import { Plus, Pencil, Trash2, ClipboardList, CalendarDays, Layers, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";

type Plan = {
  id: string; title: string; classId: string | null; teachDate: string | null;
  status: "pending" | "planning" | "completed" | "taught"; unit: string | null;
  lessonType: string | null; objectives: string | null; teachingProcess: string | null; reflection: string | null;
};

const STATUS_MAP: Record<string, string> = { pending: "待开始", planning: "备课中", completed: "已完成", taught: "已授课" };
const STATUS_COLOR: Record<string, "muted" | "default" | "outline"> = { pending: "muted", planning: "default", completed: "outline", taught: "outline" };
/** 状态 → 左侧色条 + 图标底纹（和色） */
const STATUS_ACCENT: Record<string, { bar: string; tile: string }> = {
  pending: { bar: "from-[#cfccc4] to-[#e6e4de]", tile: "bg-gradient-to-b from-[#eeece7] to-[#e5e3dc] text-neutral-6 ring-[#cfccc4]/60" },
  planning: { bar: "from-[#c56473] to-[#e0a3ac]", tile: "bg-gradient-to-b from-[#f8e4e7] to-[#f2d6da] text-primary-d ring-[#c56473]/25" },
  completed: { bar: "from-[#5e9f7e] to-[#a8cbb8]", tile: "bg-gradient-to-b from-[#e4f0e8] to-[#d5e8dc] text-[#3d7a5e] ring-[#5e9f7e]/25" },
  taught: { bar: "from-[#3d6896] to-[#9db6cf]", tile: "bg-gradient-to-b from-[#e9f0f6] to-[#dee8f0] text-[#3d6896] ring-[#3d6896]/20" },
};

export default function PlansPage() {
  const { currentClass, isLoading: classesLoading } = useCurrentClass();
  const { classes } = useClasses();
  const qc = useQueryClient();
  /** 挂载标记：SSR 与首次水合都先渲染骨架，避免 provider 数据差异导致水合不匹配 */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", classId: "", teachDate: "", status: "pending", unit: "", lessonType: "", objectives: "", teachingProcess: "", reflection: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["plans", currentClass?.id],
    queryFn: () => apiClient.get<{ data: Plan[] }>(`/plans?classId=${currentClass?.id}`),
    enabled: !!currentClass?.id,
  });

  const plans = data?.data ?? [];
  const loading = !mounted || isLoading || classesLoading;

  const createMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => apiClient.post("/plans", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plans"] }); toast.success("已添加"); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => apiClient.patch(`/plans/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plans"] }); toast.success("已保存"); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/plans/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plans"] }); toast.success("已删除"); },
  });

  const aiPlanMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => apiClient.post<{ data: { content: string; isTemplate: boolean; note?: string } }>("/ai/lesson-plan", d),
    onSuccess: (res) => {
      setForm((f) => ({ ...f, teachingProcess: res.data.content }));
      toast.success(res.data.note || "AI 教案已生成");
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });

  function openCreate() { setEditing(null); setForm({ title: "", classId: currentClass?.id ?? "", teachDate: "", status: "pending", unit: "", lessonType: "", objectives: "", teachingProcess: "", reflection: "" }); setDialogOpen(true); }
  function openEdit(p: Plan) { setEditing(p); setForm({ title: p.title, classId: p.classId ?? "", teachDate: p.teachDate ?? "", status: p.status, unit: p.unit ?? "", lessonType: p.lessonType ?? "", objectives: p.objectives ?? "", teachingProcess: p.teachingProcess ?? "", reflection: p.reflection ?? "" }); setDialogOpen(true); }

  async function handleSubmit() {
    if (!form.title.trim()) { toast.error("标题不能为空"); return; }
    const payload = { ...form, classId: form.classId || null, teachDate: form.teachDate || null };
    if (editing) await updateMut.mutateAsync({ id: editing.id, data: payload }); else await createMut.mutateAsync(payload);
    setDialogOpen(false);
  }

  /* ── 纯展示派生：状态分布与完成度 ── */
  const countOf = (s: Plan["status"]) => plans.filter((p) => p.status === s).length;
  const pendingCount = countOf("pending");
  const planningCount = countOf("planning");
  const completedCount = countOf("completed");
  const taughtCount = countOf("taught");
  const finished = completedCount + taughtCount;
  const completion = plans.length ? Math.round((finished / plans.length) * 100) : 0;
  const statusItems = [
    { label: "待开始", value: pendingCount, color: "#a8a69f" },
    { label: "备课中", value: planningCount, color: "#c56473" },
    { label: "已完成", value: completedCount, color: "#5e9f7e" },
    { label: "已授课", value: taughtCount, color: "#3d6896" },
  ];

  return (
    <div>
      <PageHeader title="备课与反思" description={`共 ${plans.length} 条记录`} />

      {/* ══════════ 概览条 ══════════ */}
      {!loading && plans.length > 0 && (
        <StatBar
          items={[
            { label: "备课总数", hint: "Lesson Plans", value: plans.length, suffix: "份" },
            { label: "待开始", hint: "To Do", value: pendingCount, suffix: "份" },
            { label: "已完成", hint: "Finished", value: completedCount, suffix: "份" },
            { label: "完成率", hint: "Completion", value: completion, suffix: "%" },
          ]}
          action={<Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" />新建备课</Button>}
        />
      )}

      {/* ══════════ 备课流程分布 ══════════ */}
      {!loading && plans.length > 0 && (
        <section className="reveal mb-4 relative overflow-hidden rounded-2xl edge-lit spotlight shadow-[0_2px_14px_-4px_rgba(36,35,31,0.10)]">
          <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(112deg,#fdf7f7_0%,#fbf8f4_42%,#f5f7fa_76%,#f2f8f5_100%)]" />
          <span className="pointer-events-none absolute inset-0 dot-veil opacity-[0.26]" />
          <span className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(197,100,115,0.16),transparent_68%)]" />
          <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="eyebrow">Lesson Workflow</p>
              <p className="mt-1 font-serif text-[17px] font-semibold text-text">备课流程分布</p>
              <div className="mt-3 max-w-xl">
                <SegmentedBar items={statusItems} height={10} unit=" 份" />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-5 sm:border-l sm:border-line/70 sm:pl-6">
              <div className="text-center">
                <p className="num-display num-glaze text-[34px] font-semibold leading-none">
                  <CountUp value={finished} />
                  <span className="text-[18px] text-neutral-4">/{plans.length}</span>
                </p>
                <p className="eyebrow mt-1.5">Completed</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ══════════ 备课记录 ══════════ */}
      <Card>
        <SectionHeader icon={ClipboardList} title="备课记录" en="Lesson Plans" tone="ume"
          right={<span className="tabular-nums">共 {plans.length} 份</span>} />
        <CardContent className="p-0">
          {loading ? <LoadingState /> : plans.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-10 w-10" />}
              title="暂无备课记录"
              description="新建一份教案，或用 AI 生成教学过程草稿"
              action={<Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" />新建备课</Button>}
            />
          ) : (
            <div className="divide-y divide-line/60">
              {plans.map((p) => {
                const accent = STATUS_ACCENT[p.status] ?? STATUS_ACCENT.pending;
                return (
                  <div key={p.id} className="group relative flex min-h-[60px] items-center gap-3.5 p-4 pl-5 transition-[background] duration-[var(--dur-quick)] hover:bg-[linear-gradient(90deg,rgba(197,100,115,0.06),rgba(197,100,115,0.02)_58%,transparent)]">
                    <span className={`absolute inset-y-2 left-0 w-[2px] rounded-full bg-gradient-to-b ${accent.bar} opacity-60 transition-opacity duration-[var(--dur-quick)] group-hover:opacity-100`} />
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.6rem] ring-1 ring-inset shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform duration-[var(--dur-smooth)] ease-[var(--ease-spring)] group-hover:scale-105 ${accent.tile}`}>
                      <ClipboardList className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium tracking-[0.01em] transition-colors duration-[var(--dur-quick)] group-hover:text-primary-d">{p.title}</span>
                        <Badge variant={STATUS_COLOR[p.status]}>{STATUS_MAP[p.status]}</Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-neutral-6">
                        <CalendarDays className="h-3.5 w-3.5 opacity-70" />
                        <span className="tabular-nums">{p.teachDate || "未定日期"}</span>
                        <span className="text-[#c9c6bd]">·</span>
                        <Layers className="h-3.5 w-3.5 opacity-70" />
                        <span>{p.lessonType || "未分类"}</span>
                        <span className="text-[#c9c6bd]">·</span>
                        <span className="font-display text-[13px] tracking-wide text-neutral-7">{p.unit || "未指定单元"}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <IconButton label={`编辑「${p.title}」`} onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></IconButton>
                      <IconButton label={`删除「${p.title}」`} tone="danger" onClick={() => setDeleteId(p.id)}><Trash2 className="h-4 w-4" /></IconButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ══════════ 下一步动作 ══════════ */}
      {!loading && (
        <NextStepCard
          icon={Sparkles}
          title="把备课推到「已授课」"
          description={`当前 ${pendingCount + planningCount} 份教案还在流程中。上完课后标记状态并补一句教学反思，学期末就是一份完整的教学档案。`}
          actions={
            <>
              <Button variant="outline" onClick={() => { if (plans[0]) openEdit(plans[0]); else openCreate(); }} className="gap-1.5">
                <Pencil className="h-4 w-4" />
                {plans[0] ? "继续最近一份" : "新建备课"}
              </Button>
              <Button onClick={openCreate} className="gap-1.5">
                <Plus className="h-4 w-4" />
                新建备课
              </Button>
            </>
          }
        />
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editing ? "编辑备课" : "新建备课"} className="max-w-2xl">
        <div className="space-y-3">
          <div className="space-y-1"><Label>标题 *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>班级</Label>
              <select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className="flex h-9 w-full rounded-md border border-line bg-panel px-3 text-sm">
                <option value="">无</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1"><Label>授课日期</Label><Input type="date" value={form.teachDate} onChange={(e) => setForm({ ...form, teachDate: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1"><Label>状态</Label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="flex h-9 w-full rounded-md border border-line bg-panel px-3 text-sm">
                {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="space-y-1"><Label>单元</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="如 Unit 1" /></div>
            <div className="space-y-1"><Label>课型</Label><Input value={form.lessonType} onChange={(e) => setForm({ ...form, lessonType: e.target.value })} placeholder="如 阅读课" /></div>
          </div>
          <div className="space-y-1"><Label>教学目标</Label><Textarea value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} rows={3} /></div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>教学过程</Label>
              <Button variant="secondary" size="sm" className="gap-1.5"
                onClick={() => aiPlanMut.mutate({ title: form.title, unit: form.unit, classId: form.classId, lessonType: form.lessonType, objectives: form.objectives })}
                disabled={aiPlanMut.isPending || !form.title.trim()}>
                <Sparkles className="h-3.5 w-3.5" />{aiPlanMut.isPending ? "生成中…" : "AI 生成教案"}
              </Button>
            </div>
            <Textarea value={form.teachingProcess} onChange={(e) => setForm({ ...form, teachingProcess: e.target.value })} rows={5} />
          </div>
          <div className="space-y-1"><Label>教学反思</Label><Textarea value={form.reflection} onChange={(e) => setForm({ ...form, reflection: e.target.value })} rows={3} /></div>
          <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending} className="w-full">保存</Button>
        </div>
      </Dialog>

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} title="确认删除">
        <p className="text-sm text-muted">删除后进入回收站，可恢复。</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteId(null)}>取消</Button>
          <Button variant="destructive" onClick={async () => { if (deleteId) await deleteMut.mutateAsync(deleteId); setDeleteId(null); }}>确认删除</Button>
        </div>
      </Dialog>
    </div>
  );
}
