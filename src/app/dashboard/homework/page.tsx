"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCurrentClass, useClasses } from "@/hooks/use-classes";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { MetricTile } from "@/components/charts/metric-tile";
import {
  Plus, Pencil, Trash2, BookOpen, CalendarDays, ArrowRight, Clock,
  CheckCircle2, FileText, Archive, Timer,
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";
import { cn } from "@/lib/utils";

type Homework = {
  id: string; title: string; classId: string | null; assignDate: string | null; dueDate: string | null;
  type: string | null; content: string | null; status: "draft" | "published" | "closed"; remark: string | null;
};

const STATUS_MAP: Record<string, string> = { draft: "草稿", published: "已发布", closed: "已关闭" };

/** 状态 → 徽标色阶（文字 / 底纹 / 圆点） */
const STATUS_STYLE: Record<string, { text: string; bg: string; dot: string; glow: string }> = {
  draft: {
    text: "#787670",
    bg: "linear-gradient(160deg,#f2f1ed,#eae8e2)",
    dot: "#a8a69f",
    glow: "rgba(120,118,112,0.18)",
  },
  published: {
    text: "#a85463",
    bg: "linear-gradient(160deg,#faeef0,#f3dde1)",
    dot: "#c56473",
    glow: "rgba(197,100,115,0.32)",
  },
  closed: {
    text: "#3d6896",
    bg: "linear-gradient(160deg,#e9f0f6,#dee8f0)",
    dot: "#3d6896",
    glow: "rgba(61,104,150,0.26)",
  },
};

/** 状态 → 左侧色条 + 图标底纹（和色） */
const STATUS_ACCENT: Record<string, { bar: string; tile: string }> = {
  draft: { bar: "from-[#cfccc4] to-[#e6e4de]", tile: "bg-gradient-to-b from-[#eeece7] to-[#e5e3dc] text-neutral-6 ring-[#cfccc4]/60" },
  published: { bar: "from-[#c56473] to-[#e0a3ac]", tile: "bg-gradient-to-b from-[#f8e4e7] to-[#f2d6da] text-primary-d ring-[#c56473]/25" },
  closed: { bar: "from-[#3d6896]/70 to-[#9db6cf]", tile: "bg-gradient-to-b from-[#e9f0f6] to-[#dee8f0] text-[#3d6896] ring-[#3d6896]/20" },
};

type DeadlineState = "open" | "soon" | "overdue";

/** 截止进度：已过时间 / 总时间；纯派生展示，不参与任何写逻辑 */
function deadlineInfo(h: Homework): { daysLeft: number; pct: number | null; state: DeadlineState } | null {
  if (!h.dueDate) return null;
  const due = new Date(`${h.dueDate}T23:59:59`);
  if (Number.isNaN(due.getTime())) return null;
  const now = new Date();
  const msLeft = due.getTime() - now.getTime();
  const daysLeft = Math.ceil(msLeft / 86400000);
  let pct: number | null = null;
  if (h.assignDate) {
    const start = new Date(`${h.assignDate}T00:00:00`);
    if (!Number.isNaN(start.getTime()) && due.getTime() > start.getTime()) {
      const p = ((now.getTime() - start.getTime()) / (due.getTime() - start.getTime())) * 100;
      pct = Math.max(0, Math.min(100, p));
    }
  }
  const state: DeadlineState = msLeft < 0 ? "overdue" : daysLeft <= 2 ? "soon" : "open";
  return { daysLeft, pct, state };
}

const DEADLINE_TONE: Record<DeadlineState, { from: string; to: string; text: string }> = {
  open: { from: "#9ccbb2", to: "#4a8f74", text: "#3d7a5e" },
  soon: { from: "#e2c58f", to: "#a87a3d", text: "#8a6230" },
  overdue: { from: "#e0a3ac", to: "#a64953", text: "#a64953" },
};

const FILTERS = [
  { key: "all", label: "全部" },
  { key: "published", label: "已发布" },
  { key: "draft", label: "草稿" },
  { key: "closed", label: "已关闭" },
] as const;

export default function HomeworkPage() {
  const { currentClass, isLoading: classesLoading } = useCurrentClass();
  const { classes } = useClasses();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Homework | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [form, setForm] = useState({ title: "", classId: "", assignDate: "", dueDate: "", type: "", content: "", status: "draft", remark: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["homework", currentClass?.id],
    queryFn: () => apiClient.get<{ data: Homework[] }>(`/homework?classId=${currentClass?.id}`),
    enabled: !!currentClass?.id,
  });
  const items = useMemo(() => data?.data ?? [], [data]);

  const counts = useMemo(() => ({
    all: items.length,
    published: items.filter((h) => h.status === "published").length,
    draft: items.filter((h) => h.status === "draft").length,
    closed: items.filter((h) => h.status === "closed").length,
  }), [items]);

  const visible = useMemo(
    () => (filter === "all" ? items : items.filter((h) => h.status === filter)),
    [items, filter]
  );

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

      {/* ══════════ KPI 条：作业状态分布 ══════════ */}
      {!isLoading && !classesLoading && items.length > 0 && (
        <div className="stagger mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricTile index={0} label="作业记录" hint="Total" value={counts.all} suffix="条" icon={BookOpen} tone="hanada" />
          <MetricTile index={1} label="已发布" hint="Published" value={counts.published} suffix="条" icon={CheckCircle2} tone="wakatake" />
          <MetricTile index={2} label="草稿" hint="Drafts" value={counts.draft} suffix="条" icon={FileText} tone="kuchiba" />
          <MetricTile index={3} label="已关闭" hint="Closed" value={counts.closed} suffix="条" icon={Archive} tone="sumi" />
        </div>
      )}

      {/* 状态筛选：玻璃胶囊 */}
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/70 bg-white/60 px-2.5 py-2 shadow-[0_1px_2px_rgba(36,35,31,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const style = f.key === "all" ? null : STATUS_STYLE[f.key];
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-all duration-[var(--dur-quick)] ease-[var(--ease-smooth)]",
                active
                  ? "bg-white font-medium text-text shadow-[0_1px_2px_rgba(36,35,31,0.10),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-inset ring-line/70"
                  : "text-muted hover:bg-white/60 hover:text-neutral-7"
              )}
            >
              {style && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: style.dot, boxShadow: `0 0 5px ${style.glow}` }} />}
              {f.label}
              <span className="tabular-nums text-[10px] text-neutral-5">{counts[f.key]}</span>
            </button>
          );
        })}
        <span className="ml-auto hidden items-center gap-1.5 text-[11px] text-muted sm:inline-flex">
          <Timer className="h-3 w-3" />
          进度条为布置 → 截止的时间进度
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading || classesLoading ? <LoadingState /> : items.length === 0 ? (
            <EmptyState icon={<BookOpen className="h-10 w-10" />} title="暂无作业" description="点击右上角布置第一份作业" />
          ) : visible.length === 0 ? (
            <EmptyState icon={<BookOpen className="h-10 w-10" />} title="该状态下暂无作业" description="切换上方筛选查看其他状态" />
          ) : (
            <div className="divide-y divide-line/70">
              {visible.map((h) => {
                const accent = STATUS_ACCENT[h.status] ?? STATUS_ACCENT.draft;
                const badge = STATUS_STYLE[h.status] ?? STATUS_STYLE.draft;
                const deadline = deadlineInfo(h);
                const tone = deadline ? DEADLINE_TONE[deadline.state] : null;
                return (
                  <div key={h.id} className="group relative flex items-center gap-3.5 p-4 pl-5 transition-colors duration-[var(--dur-quick)] hover:bg-gradient-to-r hover:from-[#f8e4e7]/55 hover:via-[#f8e4e7]/12 hover:to-transparent">
                    {/* 状态色条： hover 时点亮 */}
                    <span className={`absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-gradient-to-b ${accent.bar} opacity-45 transition-opacity duration-[var(--dur-quick)] group-hover:opacity-100`} />
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.6rem] ring-1 ring-inset ${accent.tile} shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform duration-[var(--dur-smooth)] ease-[var(--ease-spring)] group-hover:scale-105`}>
                      <BookOpen className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium tracking-[0.01em] transition-colors duration-[var(--dur-quick)] group-hover:text-primary-d">{h.title}</span>
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-[1px] text-[11px] font-medium ring-1 ring-inset ring-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                          style={{ backgroundImage: badge.bg, color: badge.text }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: badge.dot, boxShadow: `0 0 6px ${badge.glow}` }} />
                          {STATUS_MAP[h.status]}
                        </span>
                        {h.type && (
                          <span className="rounded-md bg-white/70 px-1.5 py-[1px] text-[10px] text-neutral-6 ring-1 ring-inset ring-line/70">{h.type}</span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted">
                        <CalendarDays className="h-3.5 w-3.5 opacity-70" />
                        <span className="tabular-nums">{h.assignDate || "未定"}</span>
                        <ArrowRight className="h-3 w-3 opacity-50" />
                        <span className="tabular-nums">{h.dueDate || "未定"}</span>
                        {deadline && tone && (
                          <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/70 px-1.5 py-[1px] text-[10px] ring-1 ring-inset ring-line/70" style={{ color: tone.text }}>
                            <Clock className="h-2.5 w-2.5" />
                            {deadline.state === "overdue" ? "已截止" : deadline.daysLeft <= 0 ? "今天截止" : `还剩 ${deadline.daysLeft} 天`}
                          </span>
                        )}
                      </div>
                      {deadline && tone && deadline.pct != null && (
                        <div className="mt-1.5 h-1 w-40 max-w-full overflow-hidden rounded-full bg-neutral-3/60">
                          <div
                            className="h-full rounded-full transition-[width] duration-[var(--dur-slow)] ease-[var(--ease-quick)]"
                            style={{
                              width: `${deadline.pct}%`,
                              backgroundImage: `linear-gradient(90deg, ${tone.from}, ${tone.to})`,
                              boxShadow: `0 0 6px ${tone.to}55`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1 opacity-55 transition-opacity duration-[var(--dur-quick)] group-hover:opacity-100">
                      <button onClick={() => openEdit(h)} title="编辑" aria-label={`编辑作业 ${h.title}`} className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-panel hover:text-primary hover:shadow-[var(--shadow-xs)]"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteId(h.id)} title="删除" aria-label={`删除作业 ${h.title}`} className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-[#f8e4e7] hover:text-[#a64953] hover:shadow-[var(--shadow-xs)]"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
