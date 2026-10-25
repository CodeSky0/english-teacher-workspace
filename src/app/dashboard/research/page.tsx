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
import { BreakdownBars } from "@/components/common/breakdown";
import { StatBar } from "@/components/common/stat-bar";
import { SectionHeader } from "@/components/common/section-header";
import { IconButton } from "@/components/common/icon-button";
import { NextStepCard } from "@/components/common/next-step";
import { Plus, Pencil, Trash2, PenLine, CalendarDays, Users, Eye, Presentation, Sparkles, FileText, GraduationCap, FolderOpen, Layers } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";

type Research = {
  id: string; title: string; researchDate: string | null;
  type: "observation" | "collective_planning" | "meeting" | "public_class" | "paper" | "training" | "other";
  participants: string | null; content: string | null; takeaways: string | null; insights: string | null;
};

const TYPE_MAP: Record<string, string> = { observation: "听课记录", collective_planning: "集体备课", meeting: "教研会议", public_class: "公开课", paper: "教学论文", training: "教学培训", other: "其他" };

/** 类型 → 和色图标块（底 / 字 / 环）+ 图标 + 分布条色 */
const TYPE_ACCENT: Record<string, { tile: string; icon: typeof PenLine; hex: string }> = {
  observation: { tile: "bg-gradient-to-b from-[#e9f0f6] to-[#dee8f0] text-[#3d6896] ring-[#3d6896]/20", icon: Eye, hex: "#3d6896" },
  collective_planning: { tile: "bg-gradient-to-b from-[#f8e4e7] to-[#f2d6da] text-[#c56473] ring-[#c56473]/22", icon: Users, hex: "#c56473" },
  meeting: { tile: "bg-gradient-to-b from-[#e6edf1] to-[#dbe4ea] text-[#4a6b82] ring-[#4a6b82]/20", icon: Presentation, hex: "#4a6b82" },
  public_class: { tile: "bg-gradient-to-b from-[#f9f1e1] to-[#f2e7d2] text-[#8a6230] ring-[#a87a3d]/22", icon: Sparkles, hex: "#a87a3d" },
  paper: { tile: "bg-gradient-to-b from-[#ece4f2] to-[#e0d5ec] text-[#6b4f8a] ring-[#745399]/20", icon: FileText, hex: "#745399" },
  training: { tile: "bg-gradient-to-b from-[#e4f0e8] to-[#d5e8dc] text-[#3d7a5e] ring-[#5e9f7e]/22", icon: GraduationCap, hex: "#5e9f7e" },
  other: { tile: "bg-gradient-to-b from-[#eeece7] to-[#e5e3dc] text-neutral-6 ring-[#cfccc4]/60", icon: FolderOpen, hex: "#a8a69f" },
};

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

  /* ── 纯展示派生：类型分布 / 活动计数 ── */
  const countOf = (t: Research["type"]) => items.filter((r) => r.type === t).length;
  const typeItems = (Object.keys(TYPE_MAP) as Research["type"][])
    .map((t) => ({ label: TYPE_MAP[t], value: countOf(t), color: (TYPE_ACCENT[t] ?? TYPE_ACCENT.other).hex }))
    .filter((it) => it.value > 0)
    .sort((a, b) => b.value - a.value);
  const observationCount = countOf("observation") + countOf("public_class");
  const latestDate = items.reduce<string | null>((acc, r) => (r.researchDate && (!acc || r.researchDate > acc) ? r.researchDate : acc), null);

  return (
    <div>
      <PageHeader title="教学教研" description={`共 ${items.length} 条记录`} />

      {/* ══════════ 概览条 ══════════ */}
      {!isLoading && items.length > 0 && (
        <StatBar
          items={[
            { label: "教研记录", hint: "Records", value: items.length, suffix: "条" },
            { label: "听课 · 公开课", hint: "Observation", value: observationCount, suffix: "次" },
            { label: "集体备课", hint: "Co-planning", value: countOf("collective_planning"), suffix: "次" },
            { label: "覆盖类型", hint: "Types", value: typeItems.length, suffix: "类" },
          ]}
          action={<Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" />新建记录</Button>}
        />
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* ══════════ 教研记录列表 ══════════ */}
        <Card>
          <SectionHeader icon={PenLine} title="教研记录" en="Research Log" tone="hanada"
            right={<span className="tabular-nums">共 {items.length} 条</span>} />
          <CardContent className="p-0">
            {isLoading ? <LoadingState /> : items.length === 0 ? (
              <EmptyState
                icon={<PenLine className="h-10 w-10" />}
                title="暂无教研记录"
                description="记录听课、公开课、集体备课与培训，沉淀教学反思"
                action={<Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" />新建记录</Button>}
              />
            ) : (
              <div className="divide-y divide-line/60">
                {items.map((r) => {
                  const accent = TYPE_ACCENT[r.type] ?? TYPE_ACCENT.other;
                  const Icon = accent.icon;
                  return (
                    <div key={r.id} className="group relative flex min-h-[60px] items-center gap-3.5 p-4 pl-5 transition-[background] duration-[var(--dur-quick)] hover:bg-[linear-gradient(90deg,rgba(197,100,115,0.06),rgba(197,100,115,0.02)_58%,transparent)]">
                      <span className="absolute inset-y-2 left-0 w-[2px] rounded-full opacity-0 transition-opacity duration-[var(--dur-quick)] group-hover:opacity-100"
                        style={{ backgroundImage: `linear-gradient(180deg, ${accent.hex}cc, ${accent.hex}00)` }} />
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.6rem] ring-1 ring-inset shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform duration-[var(--dur-smooth)] ease-[var(--ease-spring)] group-hover:scale-105 ${accent.tile}`}>
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-medium tracking-[0.01em] transition-colors duration-[var(--dur-quick)] group-hover:text-primary-d">{r.title}</span>
                          <Badge variant="outline">{TYPE_MAP[r.type]}</Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-neutral-6">
                          <CalendarDays className="h-3.5 w-3.5 opacity-70" />
                          <span className="tabular-nums">{r.researchDate || "未定日期"}</span>
                          {r.participants && (<>
                            <span className="text-[#c9c6bd]">·</span>
                            <Users className="h-3.5 w-3.5 opacity-70" />
                            <span className="truncate">{r.participants}</span>
                          </>)}
                        </div>
                        {r.content && <p className="mt-1 line-clamp-1 text-xs text-neutral-7">{r.content}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
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

        {/* ══════════ 侧栏：类型分布 + 概览 ══════════ */}
        <aside className="reveal space-y-4">
          <Card>
            <SectionHeader icon={Layers} title="类型分布" en="Type Mix" tone="wakatake" />
            <CardContent className="pt-4">
              {typeItems.length === 0 ? (
                <p className="py-4 text-xs text-muted">记录教研活动后，这里会按类型汇总</p>
              ) : (
                <BreakdownBars items={typeItems} unit=" 条" />
              )}
              <div className="divider-ink my-4" />
              <dl className="space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted">覆盖类型</dt>
                  <dd className="tabular-nums text-neutral-7"><b className="num-display text-[14px] font-semibold text-text">{typeItems.length}</b> / 7</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted">最近记录</dt>
                  <dd className="tabular-nums text-neutral-7">{latestDate ?? "—"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

        </aside>
      </div>

      {/* ══════════ 下一步动作 ══════════ */}
      <NextStepCard
        icon={PenLine}
        title="把教研记录整理成成果"
        description="听课与集体备课的收获，稍加整理就能变成论文或培训分享。先补一条「教学启示」，下次教研就能拿它当底稿。"
        actions={
          <>
            <Button variant="outline" onClick={() => { if (items[0]) openEdit(items[0]); else openCreate(); }} className="gap-1.5">
              <Pencil className="h-4 w-4" />
              {items[0] ? "继续最近一条" : "新建记录"}
            </Button>
            <Button onClick={openCreate} className="gap-1.5">
              <Plus className="h-4 w-4" />
              新建记录
            </Button>
          </>
        }
      />

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
