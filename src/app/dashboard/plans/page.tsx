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
import { Plus, Pencil, Trash2, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";

type Plan = {
  id: string; title: string; classId: string | null; teachDate: string | null;
  status: "pending" | "planning" | "completed" | "taught"; unit: string | null;
  lessonType: string | null; objectives: string | null; teachingProcess: string | null; reflection: string | null;
};

const STATUS_MAP: Record<string, string> = { pending: "待开始", planning: "备课中", completed: "已完成", taught: "已授课" };
const STATUS_COLOR: Record<string, "muted" | "default" | "outline"> = { pending: "muted", planning: "default", completed: "outline", taught: "outline" };

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
      <PageHeader title="备棵与反思" description={`共 ${plans.length} 条记录`}
        action={<Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" />新建备课</Button>} />
      <Card><CardContent className="p-0">
        {isLoading ? <LoadingState /> : plans.length === 0 ? <EmptyState icon={<ClipboardList className="h-10 w-10" />} title="暂无备课记录" /> :
          <div className="divide-y divide-line">
            {plans.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4 hover:bg-bg/50">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.title}</span>
                    <Badge variant={STATUS_COLOR[p.status]}>{STATUS_MAP[p.status]}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{p.teachDate || "未定日期"} · {p.lessonType || "未分类"} · {p.unit || "未指定单元"}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(p)} className="text-muted hover:text-primary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setDeleteId(p.id)} className="text-muted hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
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
