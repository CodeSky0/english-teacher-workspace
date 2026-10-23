"use client";

import { useState } from "react";
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
import { Plus, Pencil, Trash2, ClipboardList, CalendarDays, Layers } from "lucide-react";
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
  const { currentClass } = useCurrentClass();
  const { classes } = useClasses();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", classId: "", teachDate: "", status: "pending", unit: "", lessonType: "", objectives: "", teachingProcess: "", reflection: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["plans", currentClass?.id],
    queryFn: () => apiClient.get<{ data: Plan[] }>(`/plans${currentClass ? `?classId=${currentClass.id}` : ""}`),
    enabled: !!currentClass?.id,
  });

  const plans = data?.data ?? [];

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

  function openCreate() { setEditing(null); setForm({ title: "", classId: currentClass?.id ?? "", teachDate: "", status: "pending", unit: "", lessonType: "", objectives: "", teachingProcess: "", reflection: "" }); setDialogOpen(true); }
  function openEdit(p: Plan) { setEditing(p); setForm({ title: p.title, classId: p.classId ?? "", teachDate: p.teachDate ?? "", status: p.status, unit: p.unit ?? "", lessonType: p.lessonType ?? "", objectives: p.objectives ?? "", teachingProcess: p.teachingProcess ?? "", reflection: p.reflection ?? "" }); setDialogOpen(true); }

  async function handleSubmit() {
    if (!form.title.trim()) { toast.error("标题不能为空"); return; }
    const payload = { ...form, classId: form.classId || null, teachDate: form.teachDate || null };
    if (editing) await updateMut.mutateAsync({ id: editing.id, data: payload }); else await createMut.mutateAsync(payload);
    setDialogOpen(false);
  }

  return (
    <div>
      <PageHeader title="备课与反思" description={`共 ${plans.length} 条记录`}
        action={<Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" />新建备课</Button>} />
      <Card><CardContent className="p-0">
        {isLoading ? <LoadingState /> : plans.length === 0 ? <EmptyState icon={<ClipboardList className="h-10 w-10" />} title="暂无备课记录" /> :
          <div className="divide-y divide-line">
            {plans.map((p) => {
              const accent = STATUS_ACCENT[p.status] ?? STATUS_ACCENT.pending;
              return (
                <div key={p.id} className="group relative flex items-center gap-3.5 p-4 pl-5 transition-[background] duration-[var(--dur-quick)] hover:bg-gradient-to-r hover:from-[#f8e4e7]/55 hover:via-[#f8e4e7]/12 hover:to-transparent">
                  <span className={`absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-gradient-to-b ${accent.bar} opacity-45 transition-opacity duration-[var(--dur-quick)] group-hover:opacity-100`} />
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.5rem] ring-1 ring-inset ${accent.tile} shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]`}>
                    <ClipboardList className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium tracking-[0.01em]">{p.title}</span>
                      <Badge variant={STATUS_COLOR[p.status]}>{STATUS_MAP[p.status]}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted">
                      <CalendarDays className="h-3.5 w-3.5 opacity-70" />
                      <span className="tabular-nums">{p.teachDate || "未定日期"}</span>
                      <span className="text-[#c9c6bd]">·</span>
                      <Layers className="h-3.5 w-3.5 opacity-70" />
                      <span>{p.lessonType || "未分类"}</span>
                      <span className="text-[#c9c6bd]">·</span>
                      <span>{p.unit || "未指定单元"}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-55 transition-opacity duration-[var(--dur-quick)] group-hover:opacity-100">
                    <button onClick={() => openEdit(p)} title="编辑" className="rounded-md p-1.5 text-muted transition-colors hover:bg-panel hover:text-primary hover:shadow-[var(--shadow-xs)]"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => setDeleteId(p.id)} title="删除" className="rounded-md p-1.5 text-muted transition-colors hover:bg-[#f8e4e7] hover:text-[#a64953] hover:shadow-[var(--shadow-xs)]"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>}
      </CardContent></Card>

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
          <div className="space-y-1"><Label>教学过程</Label><Textarea value={form.teachingProcess} onChange={(e) => setForm({ ...form, teachingProcess: e.target.value })} rows={5} /></div>
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
