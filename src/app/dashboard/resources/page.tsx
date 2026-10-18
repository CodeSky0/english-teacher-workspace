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
import { Plus, Pencil, Trash2, FolderOpen, ExternalLink, Search, FileText, ClipboardCheck, Music, Video, BookMarked, Microscope, X } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";
import { cn } from "@/lib/utils";

type Resource = {
  id: string; title: string; type: "courseware" | "lesson_plan" | "exam" | "audio" | "video" | "reading" | "research" | "other";
  unit: string | null; description: string | null; link: string | null;
};

const TYPE_MAP: Record<string, string> = { courseware: "课件", lesson_plan: "教案", exam: "试题", audio: "音频", video: "视频", reading: "阅读材料", research: "教研材料", other: "其他" };

/** 类型 → 和色图标块（底 / 字 / 环） */
const TYPE_ACCENT: Record<string, { tile: string; icon: typeof FileText }> = {
  courseware: { tile: "bg-gradient-to-b from-[#f8e4e7] to-[#f2d6da] text-[#c56473] ring-[#c56473]/22", icon: FileText },
  lesson_plan: { tile: "bg-gradient-to-b from-[#e9f0f6] to-[#dee8f0] text-[#3d6896] ring-[#3d6896]/20", icon: ClipboardCheck },
  exam: { tile: "bg-gradient-to-b from-[#f7e6e7] to-[#f0d7d9] text-[#a64953] ring-[#a64953]/20", icon: ClipboardCheck },
  audio: { tile: "bg-gradient-to-b from-[#f9f1e1] to-[#f2e7d2] text-[#8a6230] ring-[#a87a3d]/22", icon: Music },
  video: { tile: "bg-gradient-to-b from-[#ece4f2] to-[#e0d5ec] text-[#6b4f8a] ring-[#745399]/20", icon: Video },
  reading: { tile: "bg-gradient-to-b from-[#e4f0e8] to-[#d5e8dc] text-[#3d7a5e] ring-[#5e9f7e]/22", icon: BookMarked },
  research: { tile: "bg-gradient-to-b from-[#e6edf1] to-[#dbe4ea] text-[#4a6b82] ring-[#4a6b82]/20", icon: Microscope },
  other: { tile: "bg-gradient-to-b from-[#eeece7] to-[#e5e3dc] text-neutral-6 ring-[#cfccc4]/60", icon: FolderOpen },
};

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

  const createMut = useMutation({ mutationFn: (d: Record<string, unknown>) => apiClient.post("/resources", d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["resources"] }); toast.success("已添加"); setDialogOpen(false); }, onError: (e: unknown) => toast.error(getErrorMessage(e)) });
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => apiClient.patch(`/resources/${id}`, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["resources"] }); toast.success("已保存"); setDialogOpen(false); }, onError: (e: unknown) => toast.error(getErrorMessage(e)) });
  const deleteMut = useMutation({ mutationFn: (id: string) => apiClient.delete(`/resources/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["resources"] }); toast.success("已删除"); }, onError: (e: unknown) => toast.error(getErrorMessage(e)) });

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
      {/* 筛选条：搜索框 + 和色类型芯片 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索资源…"
            className="h-9 w-52 pl-8 pr-7 text-[13px]" />
          {search && (
            <button onClick={() => setSearch("")} title="清空"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted transition-colors hover:text-primary">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[["", "全部"], ...Object.entries(TYPE_MAP)].map(([k, v]) => {
            const active = typeFilter === k;
            return (
              <button key={k || "all"} onClick={() => setTypeFilter(k)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs transition-all duration-[var(--dur-quick)]",
                  active
                    ? "bg-gradient-to-b from-[#c56473] to-[#b05564] text-white shadow-[0_2px_6px_-1px_rgba(168,84,99,0.5),inset_0_1px_0_rgba(255,255,255,0.28)]"
                    : "bg-panel text-neutral-6 ring-1 ring-inset ring-line hover:bg-[#f8e4e7]/55 hover:text-primary-d",
                )}>
                {v}
                {k ? <span className={cn("ml-1 tabular-nums", active ? "text-white/70" : "text-muted")}>{items.filter((r) => r.type === k).length}</span> : null}
              </button>
            );
          })}
        </div>
      </div>
      <Card><CardContent className="p-0">
        {isLoading ? <LoadingState /> : filtered.length === 0 ? <EmptyState icon={<FolderOpen className="h-10 w-10" />} title="暂无资源" /> :
          <div className="divide-y divide-line">
            {filtered.map((r) => {
              const accent = TYPE_ACCENT[r.type] ?? TYPE_ACCENT.other;
              const Icon = accent.icon;
              return (
                <div key={r.id} className="group relative flex items-center gap-3.5 p-4 pl-5 transition-[background] duration-[var(--dur-quick)] hover:bg-gradient-to-r hover:from-[#f8e4e7]/55 hover:via-[#f8e4e7]/12 hover:to-transparent">
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.5rem] ring-1 ring-inset shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]", accent.tile)}>
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium tracking-[0.01em]">{r.title}</span>
                      <Badge variant="muted">{TYPE_MAP[r.type]}</Badge>
                      {r.unit && <Badge variant="outline">{r.unit}</Badge>}
                    </div>
                    {r.description && <p className="mt-1 line-clamp-1 text-xs text-muted">{r.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 opacity-55 transition-opacity duration-[var(--dur-quick)] group-hover:opacity-100">
                    {r.link && <a href={r.link} target="_blank" rel="noopener noreferrer" title="打开链接" className="rounded-md p-1.5 text-muted transition-colors hover:bg-panel hover:text-primary hover:shadow-[var(--shadow-xs)]"><ExternalLink className="h-4 w-4" /></a>}
                    <button onClick={() => openEdit(r)} title="编辑" className="rounded-md p-1.5 text-muted transition-colors hover:bg-panel hover:text-primary hover:shadow-[var(--shadow-xs)]"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => setDeleteId(r.id)} title="删除" className="rounded-md p-1.5 text-muted transition-colors hover:bg-[#f8e4e7] hover:text-[#a64953] hover:shadow-[var(--shadow-xs)]"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              );
            })}
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
