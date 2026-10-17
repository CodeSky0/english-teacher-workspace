"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { Plus, Pencil, Trash2, PenLine } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";

type Research = {
  id: string; title: string; researchDate: string | null;
  type: "observation" | "collective_planning" | "meeting" | "public_class" | "paper" | "training" | "other";
  participants: string | null; content: string | null; takeaways: string | null; insights: string | null;
};

const TYPE_MAP: Record<string, string> = { observation: "听课记录", collective_planning: "集体备课", meeting: "教研会议", public_class: "公开课", paper: "教学论文", training: "教学培训", other: "其他" };

export default function ResearchPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Research | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", researchDate: "", type: "meeting", participants: "", content: "", takeaways: "", insights: "" });

  const { data, isLoading } = useQuery({ queryKey: ["research"], queryFn: () => apiClient.get<{ data: Research[] }>("/research") });
  const items = data?.data ?? [];

  const createMut = useMutation({ mutationFn: (d: Record<string, unknown>) => apiClient.post("/research", d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["research"] }); toast.success("已添加"); }, onError: (e: unknown) => toast.error(getErrorMessage(e)) });
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => apiClient.patch(`/research/${id}`, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["research"] }); toast.success("已保存"); }, onError: (e: unknown) => toast.error(getErrorMessage(e)) });
  const deleteMut = useMutation({ mutationFn: (id: string) => apiClient.delete(`/research/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["research"] }); toast.success("已删除"); } });

  function openCreate() { setEditing(null); setForm({ title: "", researchDate: "", type: "meeting", participants: "", content: "", takeaways: "", insights: "" }); setDialogOpen(true); }
  function openEdit(r: Research) { setEditing(r); setForm({ title: r.title, researchDate: r.researchDate ?? "", type: r.type, participants: r.participants ?? "", content: r.content ?? "", takeaways: r.takeaways ?? "", insights: r.insights ?? "" }); setDialogOpen(true); }

  async function handleSubmit() {
    if (!form.title.trim()) { toast.error("标题不能为空"); return; }
    const payload = { ...form, researchDate: form.researchDate || null };
    if (editing) await updateMut.mutateAsync({ id: editing.id, data: payload }); else await createMut.mutateAsync(payload);
    setDialogOpen(false);
  }

  return (
    <div>
      <PageHeader title="教学教研" description={`共 ${items.length} 条记录`}
        action={<Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" />新建记录</Button>} />
      <Card><CardContent className="p-0">
        {isLoading ? <LoadingState /> : items.length === 0 ? <EmptyState icon={<PenLine className="h-10 w-10" />} title="暂无教研记录" /> :
          <div className="divide-y divide-line">
            {items.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-4 hover:bg-bg/50">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="font-medium">{r.title}</span><Badge variant="outline">{TYPE_MAP[r.type]}</Badge></div>
                  <p className="mt-0.5 text-xs text-muted">{r.researchDate || "未定日期"}{r.participants ? ` · ${r.participants}` : ""}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(r)} className="text-muted hover:text-primary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setDeleteId(r.id)} className="text-muted hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>}
      </CardContent></Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editing ? "编辑教研记录" : "新建教研记录"} className="max-w-2xl">
        <div className="space-y-3">
          <div className="space-y-1"><Label>标题 *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>日期</Label><Input type="date" value={form.researchDate} onChange={(e) => setForm({ ...form, researchDate: e.target.value })} /></div>
            <div className="space-y-1"><Label>类型</Label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="flex h-9 w-full rounded-md border border-line bg-panel px-3 text-sm">
                {Object.entries(TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1"><Label>参与人员</Label><Input value={form.participants} onChange={(e) => setForm({ ...form, participants: e.target.value })} /></div>
          <div className="space-y-1"><Label>活动内容</Label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={4} /></div>
          <div className="space-y-1"><Label>主要收获</Label><Textarea value={form.takeaways} onChange={(e) => setForm({ ...form, takeaways: e.target.value })} rows={3} /></div>
          <div className="space-y-1"><Label>教学启示</Label><Textarea value={form.insights} onChange={(e) => setForm({ ...form, insights: e.target.value })} rows={3} /></div>
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
