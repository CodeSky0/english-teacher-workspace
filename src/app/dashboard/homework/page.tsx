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
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";

type Homework = {
  id: string; title: string; classId: string | null; assignDate: string | null; dueDate: string | null;
  type: string | null; content: string | null; status: "draft" | "published" | "closed"; remark: string | null;
};

const STATUS_MAP: Record<string, string> = { draft: "草稿", published: "已发布", closed: "已关闭" };
const STATUS_COLOR: Record<string, "muted" | "default" | "outline"> = { draft: "muted", published: "default", closed: "outline" };

export default function HomeworkPage() {
  const { currentClass } = useCurrentClass();
  const { classes } = useClasses();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Homework | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", classId: "", assignDate: "", dueDate: "", type: "", content: "", status: "draft", remark: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["homework", currentClass?.id],
    queryFn: () => apiClient.get<{ data: Homework[] }>(`/homework${currentClass ? `?classId=${currentClass.id}` : ""}`),
  });
  const items = data?.data ?? [];

  const createMut = useMutation({ mutationFn: (d: Record<string, unknown>) => apiClient.post("/homework", d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["homework"] }); toast.success("已添加"); }, onError: (e: unknown) => toast.error(getErrorMessage(e)) });
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => apiClient.patch(`/homework/${id}`, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["homework"] }); toast.success("已保存"); }, onError: (e: unknown) => toast.error(getErrorMessage(e)) });
  const deleteMut = useMutation({ mutationFn: (id: string) => apiClient.delete(`/homework/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["homework"] }); toast.success("已删除"); } });

  function openCreate() { setEditing(null); setForm({ title: "", classId: currentClass?.id ?? "", assignDate: "", dueDate: "", type: "", content: "", status: "draft", remark: "" }); setDialogOpen(true); }
  function openEdit(h: Homework) { setEditing(h); setForm({ title: h.title, classId: h.classId ?? "", assignDate: h.assignDate ?? "", dueDate: h.dueDate ?? "", type: h.type ?? "", content: h.content ?? "", status: h.status, remark: h.remark ?? "" }); setDialogOpen(true); }

  async function handleSubmit() {
    if (!form.title.trim()) { toast.error("标题不能为空"); return; }
    const payload = { ...form, classId: form.classId || null, assignDate: form.assignDate || null, dueDate: form.dueDate || null };
    if (editing) await updateMut.mutateAsync({ id: editing.id, data: payload }); else await createMut.mutateAsync(payload);
    setDialogOpen(false);
  }

  return (
    <div>
      <PageHeader title="作业与练习" description={`共 ${items.length} 条记录`}
        action={<Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" />布置作业</Button>} />
      <Card><CardContent className="p-0">
        {isLoading ? <LoadingState /> : items.length === 0 ? <EmptyState icon={<BookOpen className="h-10 w-10" />} title="暂无作业" /> :
          <div className="divide-y divide-line">
            {items.map((h) => (
              <div key={h.id} className="flex items-center justify-between p-4 hover:bg-bg/50">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="font-medium">{h.title}</span><Badge variant={STATUS_COLOR[h.status]}>{STATUS_MAP[h.status]}</Badge></div>
                  <p className="mt-0.5 text-xs text-muted">{h.assignDate || "未定"} → {h.dueDate || "未定"}{h.type ? ` · ${h.type}` : ""}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(h)} className="text-muted hover:text-primary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setDeleteId(h.id)} className="text-muted hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>}
      </CardContent></Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editing ? "编辑作业" : "布置作业"} className="max-w-2xl">
        <div className="space-y-3">
          <div className="space-y-1"><Label>标题 *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>班级</Label>
              <select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className="flex h-9 w-full rounded-md border border-line bg-panel px-3 text-sm">
                <option value="">无</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1"><Label>类型</Label><Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="如 词汇练习" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>布置日期</Label><Input type="date" value={form.assignDate} onChange={(e) => setForm({ ...form, assignDate: e.target.value })} /></div>
            <div className="space-y-1"><Label>截止日期</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
          </div>
          <div className="space-y-1"><Label>状态</Label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="flex h-9 w-full rounded-md border border-line bg-panel px-3 text-sm">
              {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="space-y-1"><Label>内容</Label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={4} /></div>
          <div className="space-y-1"><Label>备注</Label><Input value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></div>
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
