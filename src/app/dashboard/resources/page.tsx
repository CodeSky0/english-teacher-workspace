"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { Plus, Pencil, Trash2, FolderOpen, ExternalLink, Search } from "lucide-react";
import { toast } from "sonner";

type Resource = {
  id: string; title: string; type: "courseware" | "lesson_plan" | "exam" | "audio" | "video" | "reading" | "research" | "other";
  unit: string | null; description: string | null; link: string | null;
};

const TYPE_MAP: Record<string, string> = { courseware: "课件", lesson_plan: "教案", exam: "试题", audio: "音频", video: "视频", reading: "阅读材料", research: "教研材料", other: "其他" };

export default function ResourcesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", type: "other", unit: "", description: "", link: "" });

  const { data, isLoading } = useQuery({ queryKey: ["resources"], queryFn: () => apiClient.get<{ data: Resource[] }>("/resources") });
  const items = data?.data ?? [];

  const filtered = useMemo(() => {
    return items.filter((r) => {
      if (typeFilter && r.type !== typeFilter) return false;
      if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [items, search, typeFilter]);

  const createMut = useMutation({ mutationFn: (d: any) => apiClient.post("/resources", d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["resources"] }); toast.success("已添加"); setDialogOpen(false); }, onError: (e: any) => toast.error(e.message) });
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.patch(`/resources/${id}`, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["resources"] }); toast.success("已保存"); setDialogOpen(false); }, onError: (e: any) => toast.error(e.message) });
  const deleteMut = useMutation({ mutationFn: (id: string) => apiClient.delete(`/resources/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["resources"] }); toast.success("已删除"); }, onError: (e: any) => toast.error(e.message) });

  function openCreate() { setEditing(null); setForm({ title: "", type: "other", unit: "", description: "", link: "" }); setDialogOpen(true); }
  function openEdit(r: Resource) { setEditing(r); setForm({ title: r.title, type: r.type, unit: r.unit ?? "", description: r.description ?? "", link: r.link ?? "" }); setDialogOpen(true); }

  async function handleSubmit() {
    if (!form.title.trim()) { toast.error("标题不能为空"); return; }
    const payload = { ...form, unit: form.unit || null, link: form.link || null };
    if (editing) await updateMut.mutateAsync({ id: editing.id, data: payload }); else await createMut.mutateAsync(payload);
  }

  return (
    <div>
      <PageHeader title="资源库" description={`共 ${items.length} 条资源`}
        action={<Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" />添加资源</Button>} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1"><Search className="h-4 w-4 text-muted" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索…" className="h-8 w-40" /></div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="flex h-8 rounded-md border border-line bg-panel px-3 text-sm">
          <option value="">全部类型</option>
          {Object.entries(TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <Card><CardContent className="p-0">
        {isLoading ? <LoadingState /> : filtered.length === 0 ? <EmptyState icon={<FolderOpen className="h-10 w-10" />} title="暂无资源" /> :
          <div className="divide-y divide-line">
            {filtered.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-4 hover:bg-bg/50">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.title}</span>
                    <Badge variant="muted">{TYPE_MAP[r.type]}</Badge>
                    {r.unit && <Badge variant="outline">{r.unit}</Badge>}
                  </div>
                  {r.description && <p className="mt-0.5 text-xs text-muted">{r.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {r.link && <a href={r.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-d"><ExternalLink className="h-4 w-4" /></a>}
                  <button onClick={() => openEdit(r)} className="text-muted hover:text-primary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setDeleteId(r.id)} className="text-muted hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>}
      </CardContent></Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editing ? "编辑资源" : "添加资源"}>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>标题 *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>类型</Label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="flex h-9 w-full rounded-md border border-line bg-panel px-3 text-sm">
                {Object.entries(TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label>所属单元</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="如 Unit 1" /></div>
          </div>
          <div className="space-y-1.5"><Label>简介</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
          <div className="space-y-1.5"><Label>链接</Label><Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://…" /></div>
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
