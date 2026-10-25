"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { SegmentedBar } from "@/components/common/breakdown";
import { SectionHeader } from "@/components/common/section-header";
import { GlassToolbar } from "@/components/common/toolbar";
import { StatBar } from "@/components/common/stat-bar";
import { IconButton } from "@/components/common/icon-button";
import { Plus, Pencil, Trash2, FolderOpen, ExternalLink, Search, FileText, ClipboardCheck, Music, Video, BookMarked, Microscope, X, Upload, Eye, FileX, Layers } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";
import { cn, formatDate } from "@/lib/utils";

type Resource = {
  id: string; title: string; type: "courseware" | "lesson_plan" | "exam" | "audio" | "video" | "reading" | "research" | "other";
  unit: string | null; description: string | null; link: string | null;
  fileName: string | null; blobUrl: string | null; mimeType: string | null; fileSize: number | null;
  createdAt?: string;
};

const TYPE_MAP: Record<string, string> = { courseware: "课件", lesson_plan: "教案", exam: "试题", audio: "音频", video: "视频", reading: "阅读材料", research: "教研材料", other: "其他" };

const TYPE_ACCENT: Record<string, { tile: string; icon: typeof FileText; hex: string }> = {
  courseware: { tile: "bg-gradient-to-b from-[#f8e4e7] to-[#f2d6da] text-[#c56473] ring-[#c56473]/22", icon: FileText, hex: "#c56473" },
  lesson_plan: { tile: "bg-gradient-to-b from-[#e9f0f6] to-[#dee8f0] text-[#3d6896] ring-[#3d6896]/20", icon: ClipboardCheck, hex: "#3d6896" },
  exam: { tile: "bg-gradient-to-b from-[#f7e6e7] to-[#f0d7d9] text-[#a64953] ring-[#a64953]/20", icon: ClipboardCheck, hex: "#a64953" },
  audio: { tile: "bg-gradient-to-b from-[#f9f1e1] to-[#f2e7d2] text-[#8a6230] ring-[#a87a3d]/22", icon: Music, hex: "#a87a3d" },
  video: { tile: "bg-gradient-to-b from-[#ece4f2] to-[#e0d5ec] text-[#6b4f8a] ring-[#745399]/20", icon: Video, hex: "#745399" },
  reading: { tile: "bg-gradient-to-b from-[#e4f0e8] to-[#d5e8dc] text-[#3d7a5e] ring-[#5e9f7e]/22", icon: BookMarked, hex: "#5e9f7e" },
  research: { tile: "bg-gradient-to-b from-[#e6edf1] to-[#dbe4ea] text-[#4a6b82] ring-[#4a6b82]/20", icon: Microscope, hex: "#4a6b82" },
  other: { tile: "bg-gradient-to-b from-[#eeece7] to-[#e5e3dc] text-neutral-6 ring-[#cfccc4]/60", icon: FolderOpen, hex: "#a8a69f" },
};

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** 从外链里取出域名，作为来源标识（纯展示） */
function linkHost(link: string | null): string | null {
  if (!link) return null;
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function isAudio(mime: string | null) { return !!mime && mime.startsWith("audio/"); }
function isVideo(mime: string | null) { return !!mime && mime.startsWith("video/"); }
function isPdf(mime: string | null) { return mime === "application/pdf"; }
function isImage(mime: string | null) { return !!mime && mime.startsWith("image/"); }

export default function ResourcesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", type: "other", unit: "", description: "", link: "" });

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadMeta, setUploadMeta] = useState({ title: "", type: "", unit: "", description: "" });
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewRes, setPreviewRes] = useState<Resource | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["resources"], queryFn: () => apiClient.get<{ data: Resource[] }>("/resources") });
  const items = useMemo(() => data?.data ?? [], [data]);

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
  const uploadMut = useMutation({
    mutationFn: (vars: { file: File; fields: Record<string, string> }) => apiClient.upload("/resources/upload", vars.file, vars.fields),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["resources"] }); toast.success("上传成功"); setUploadOpen(false); setUploadFile(null); setUploadMeta({ title: "", type: "", unit: "", description: "" }); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
  const removeFileMut = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/resources/${id}/file`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["resources"] }); toast.success("已移除文件"); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });

  function openCreate() { setEditing(null); setForm({ title: "", type: "other", unit: "", description: "", link: "" }); setDialogOpen(true); }
  function openEdit(r: Resource) { setEditing(r); setForm({ title: r.title, type: r.type, unit: r.unit ?? "", description: r.description ?? "", link: r.link ?? "" }); setDialogOpen(true); }

  async function handleSubmit() {
    if (!form.title.trim()) { toast.error("标题不能为空"); return; }
    const payload = { ...form, unit: form.unit || null, link: form.link || null };
    if (editing) await updateMut.mutateAsync({ id: editing.id, data: payload }); else await createMut.mutateAsync(payload);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) { setUploadFile(file); setUploadMeta((m) => ({ ...m, title: m.title || file.name.replace(/\.[^.]+$/, "") })); }
  }, []);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) { setUploadFile(file); setUploadMeta((m) => ({ ...m, title: m.title || file.name.replace(/\.[^.]+$/, "") })); }
    e.target.value = "";
  }

  async function handleUpload() {
    if (!uploadFile) { toast.error("请先选择文件"); return; }
    await uploadMut.mutateAsync({
      file: uploadFile,
      fields: {
        title: uploadMeta.title || uploadFile.name,
        type: uploadMeta.type || "",
        unit: uploadMeta.unit,
        description: uploadMeta.description,
      },
    });
  }

  /* ── 纯展示派生：类型分布 / 文件与链接计数 ── */
  const typeItems = (Object.keys(TYPE_MAP) as Resource["type"][])
    .map((t) => ({ label: TYPE_MAP[t], value: items.filter((r) => r.type === t).length, color: (TYPE_ACCENT[t] ?? TYPE_ACCENT.other).hex }))
    .filter((it) => it.value > 0)
    .sort((a, b) => b.value - a.value);
  const fileCount = items.filter((r) => !!r.blobUrl).length;
  const linkCount = items.filter((r) => !!r.link).length;

  return (
    <div>
      <PageHeader title="资源库" description={`共 ${items.length} 条资源`}
        action={<Button variant="outline" onClick={() => setUploadOpen(true)} className="gap-1.5"><Upload className="h-4 w-4" />上传文件</Button>} />

      {/* ══════════ 概览条 ══════════ */}
      {!isLoading && items.length > 0 && (
        <StatBar
          items={[
            { label: "资源总数", hint: "Resources", value: items.length, suffix: "条" },
            { label: "类型覆盖", hint: "Types", value: typeItems.length, suffix: "类" },
            { label: "外部链接", hint: "Links", value: linkCount, suffix: "条" },
            { label: "上传文件", hint: "Files", value: fileCount, suffix: "个" },
          ]}
          action={<Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" />添加资源</Button>}
        />
      )}

      {/* ══════════ 玻璃工具条：搜索 + 类型筛选 ══════════ */}
      <GlassToolbar>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索资源标题…"
            className="h-8 w-52 border-0 bg-transparent pl-7 pr-7 text-[13px] shadow-none focus-visible:shadow-none" />
          {search && (
            <button onClick={() => setSearch("")} aria-label="清空搜索" title="清空搜索"
              className="absolute right-1 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-neutral-6 transition-colors hover:text-primary">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <span className="hidden h-4 w-px bg-line sm:block" />
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
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2 py-0.5 text-[11px] text-neutral-6 ring-1 ring-inset ring-line/70">
          <Layers className="h-3 w-3" />
          文件 <b className="tabular-nums">{fileCount}</b> · 链接 <b className="tabular-nums">{linkCount}</b>
        </span>
      </GlassToolbar>

      {/* ══════════ 资源列表 ══════════ */}
      <Card>
        <SectionHeader icon={FolderOpen} title="资源列表" en="Resources" tone="hanada"
          right={<span className="tabular-nums">{filtered.length} / {items.length} 条</span>} />
        {typeItems.length > 0 && (
          <div className="flex items-center gap-3 border-b border-line/60 px-5 py-2.5">
            <span className="eyebrow shrink-0">Type Mix</span>
            <SegmentedBar items={typeItems} height={6} showLegend={false} className="min-w-0 flex-1" />
            <span className="shrink-0 text-[11px] tabular-nums text-neutral-6">{typeItems.length} 种类型</span>
          </div>
        )}
        <CardContent className="p-0">
          {isLoading ? <LoadingState /> : filtered.length === 0 ? (
            <EmptyState
              icon={<FolderOpen className="h-10 w-10" />}
              title={search || typeFilter ? "未找到匹配资源" : "暂无资源"}
              description={search || typeFilter ? "换个关键词，或点「全部」查看所有资源" : "上传课件、音频、视频，或添加外部链接"}
              action={search || typeFilter ? (
                <Button variant="outline" onClick={() => { setSearch(""); setTypeFilter(""); }}>清空筛选</Button>
              ) : (
                <Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" />添加资源</Button>
              )}
            />
          ) : (
            <div className="divide-y divide-line/60">
              {filtered.map((r) => {
                const accent = TYPE_ACCENT[r.type] ?? TYPE_ACCENT.other;
                const Icon = accent.icon;
                const hasFile = !!r.blobUrl;
                const showPreview = hasFile && (isAudio(r.mimeType) || isVideo(r.mimeType) || isPdf(r.mimeType) || isImage(r.mimeType));
                return (
                  <div key={r.id} className="group relative flex min-h-[60px] items-center gap-3.5 p-4 pl-5 transition-[background] duration-[var(--dur-quick)] hover:bg-[linear-gradient(90deg,rgba(197,100,115,0.06),rgba(197,100,115,0.02)_58%,transparent)]">
                    <span className="absolute inset-y-2 left-0 w-[2px] rounded-full opacity-0 transition-opacity duration-[var(--dur-quick)] group-hover:opacity-100"
                      style={{ backgroundImage: `linear-gradient(180deg, ${accent.hex}cc, ${accent.hex}00)` }} />
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.6rem] ring-1 ring-inset shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform duration-[var(--dur-smooth)] ease-[var(--ease-spring)] group-hover:scale-105", accent.tile)}>
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium tracking-[0.01em] transition-colors duration-[var(--dur-quick)] group-hover:text-primary-d">{r.title}</span>
                        <Badge variant="muted">{TYPE_MAP[r.type]}</Badge>
                        {r.unit && <Badge variant="outline">{r.unit}</Badge>}
                      </div>
                      {r.description && <p className="mt-1 line-clamp-1 text-xs text-neutral-7">{r.description}</p>}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-neutral-6">
                        {linkHost(r.link) && (
                          <span className="inline-flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            {linkHost(r.link)}
                          </span>
                        )}
                        {hasFile && <span className="tabular-nums">{formatSize(r.fileSize) || "已上传"}</span>}
                        {r.createdAt && <span className="tabular-nums">{formatDate(r.createdAt)}</span>}
                        {!r.link && !hasFile && <span>手动添加</span>}
                      </div>
                      {hasFile && isAudio(r.mimeType) && (
                        <audio controls preload="none" src={r.blobUrl ?? undefined} className="mt-2 h-8 w-full max-w-md" />
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5 transition-opacity duration-[var(--dur-quick)]">
                      {showPreview && <IconButton label={`预览「${r.title}」`} onClick={() => setPreviewRes(r)}><Eye className="h-4 w-4" /></IconButton>}
                      {r.link && (
                        <a
                          href={r.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`在新窗口打开「${r.title}」`}
                          title={`在新窗口打开「${r.title}」`}
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-neutral-6 transition-colors duration-[var(--dur-quick)] hover:bg-neutral-2/70 hover:text-primary"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      <IconButton label={`编辑「${r.title}」`} onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></IconButton>
                      <IconButton label={`删除「${r.title}」`} tone="danger" onClick={() => setDeleteId(r.id)}><Trash2 className="h-4 w-4" /></IconButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
          {editing?.blobUrl && (
            <div className="rounded-lg border border-line bg-neutral-1/50 p-3">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted" />
                <span className="truncate">{editing.fileName}</span>
                <span className="ml-auto text-xs text-muted">{formatSize(editing.fileSize)}</span>
              </div>
              <Button variant="outline" size="sm" className="mt-2 gap-1.5" onClick={() => removeFileMut.mutate(editing.id)} disabled={removeFileMut.isPending}>
                <FileX className="h-3.5 w-3.5" />移除文件
              </Button>
            </div>
          )}
          <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending} className="w-full">保存</Button>
        </div>
      </Dialog>

      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} title="上传文件" description="支持音频、视频、PDF、图片、课件等，最大 50MB">
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all duration-[var(--dur-smooth)]",
              dragging ? "border-primary bg-[#f5dde0]/60 scale-[1.01]" : "border-line bg-neutral-1/40 hover:border-primary/50 hover:bg-[#f5dde0]/30",
            )}
          >
            <Upload className={cn("h-8 w-8 transition-colors", dragging ? "text-primary" : "text-muted")} />
            <p className="mt-2 text-sm font-medium">{uploadFile ? uploadFile.name : "点击或拖拽文件到此处"}</p>
            <p className="mt-1 text-xs text-muted">{uploadFile ? `${formatSize(uploadFile.size)} · ${uploadFile.type || "未知类型"}` : "音频 / 视频 / PDF / 图片 / 课件"}</p>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect}
              accept="audio/*,video/*,.pdf,image/*,.ppt,.pptx,.doc,.docx" />
          </div>
          {uploadFile && (
            <>
              <div className="space-y-1.5"><Label>标题</Label><Input value={uploadMeta.title} onChange={(e) => setUploadMeta({ ...uploadMeta, title: e.target.value })} placeholder={uploadFile.name} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>类型（可选）</Label>
                  <select value={uploadMeta.type} onChange={(e) => setUploadMeta({ ...uploadMeta, type: e.target.value })} className="flex h-9 w-full rounded-md border border-line bg-panel px-3 text-sm">
                    <option value="">自动判断</option>
                    {Object.entries(TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5"><Label>所属单元</Label><Input value={uploadMeta.unit} onChange={(e) => setUploadMeta({ ...uploadMeta, unit: e.target.value })} placeholder="如 Unit 1" /></div>
              </div>
              <div className="space-y-1.5"><Label>简介</Label><Textarea value={uploadMeta.description} onChange={(e) => setUploadMeta({ ...uploadMeta, description: e.target.value })} rows={2} /></div>
            </>
          )}
          <Button onClick={handleUpload} disabled={!uploadFile || uploadMut.isPending} className="w-full gap-1.5">
            <Upload className="h-4 w-4" />{uploadMut.isPending ? "上传中…" : "上传"}
          </Button>
        </div>
      </Dialog>

      <Dialog open={!!previewRes} onClose={() => setPreviewRes(null)} title={previewRes?.title} className="max-w-3xl">
        {previewRes?.blobUrl && (
          <div className="overflow-hidden rounded-lg">
            {isAudio(previewRes.mimeType) && <audio controls src={previewRes.blobUrl} className="w-full" />}
            {isVideo(previewRes.mimeType) && <video controls src={previewRes.blobUrl} className="max-h-[70vh] w-full" />}
            {isPdf(previewRes.mimeType) && <iframe src={previewRes.blobUrl} className="h-[70vh] w-full border-0" title={previewRes.title} />}
            {isImage(previewRes.mimeType) && <img src={previewRes.blobUrl} alt={previewRes.title} className="max-h-[70vh] w-full object-contain" />}
          </div>
        )}
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
