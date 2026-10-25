"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { SectionHeader } from "@/components/common/section-header";
import { StatBar } from "@/components/common/stat-bar";
import { IconButton } from "@/components/common/icon-button";
import { GlassToolbar } from "@/components/common/toolbar";
import { downloadExport } from "@/lib/excel/client";
import { Plus, Pencil, Trash2, BookOpen, Volume2, ChevronRight, Upload, Download, Sparkles, Copy } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";

const ImportDialog = dynamic(() => import("@/components/common/import-dialog").then((m) => m.ImportDialog), {
  ssr: false,
});

type VocabUnit = { id: string; name: string; textbookVersion: string | null; gradeLevel: string | null };
type VocabWord = { id: string; unitId: string; word: string; meaning: string | null; phoneticUs: string | null; partOfSpeech: string | null; exampleEn: string | null; exampleZh: string | null };

export default function VocabPage() {
  const qc = useQueryClient();
  const [selectedUnit, setSelectedUnit] = useState<VocabUnit | null>(null);
  const [unitDialog, setUnitDialog] = useState(false);
  const [wordDialog, setWordDialog] = useState(false);
  const [editingWord, setEditingWord] = useState<VocabWord | null>(null);
  const [unitForm, setUnitForm] = useState({ name: "", textbookVersion: "", gradeLevel: "" });
  const [wordForm, setWordForm] = useState({ word: "", meaning: "", phoneticUs: "", partOfSpeech: "", exampleEn: "", exampleZh: "" });
  const [importOpen, setImportOpen] = useState(false);
  const [importUnitId, setImportUnitId] = useState("");
  const [newUnitName, setNewUnitName] = useState("");
  const [exporting, setExporting] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiExerciseType, setAiExerciseType] = useState("mixed");

  const { data: unitsData, isLoading } = useQuery({ queryKey: ["vocab-units"], queryFn: () => apiClient.get<{ data: VocabUnit[] }>("/vocab/units") });
  const units = unitsData?.data ?? [];

  const { data: wordsData } = useQuery({
    queryKey: ["vocab-words", selectedUnit?.id],
    queryFn: () => apiClient.get<{ data: VocabWord[] }>(`/vocab/words?unitId=${selectedUnit?.id}`),
    enabled: !!selectedUnit,
  });
  const words = wordsData?.data ?? [];

  const createUnitMut = useMutation({ mutationFn: (d: Record<string, unknown>) => apiClient.post("/vocab/units", d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["vocab-units"] }); toast.success("已添加"); setUnitDialog(false); }, onError: (e: unknown) => toast.error(getErrorMessage(e)) });
  const deleteUnitMut = useMutation({ mutationFn: (id: string) => apiClient.delete(`/vocab/units/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["vocab-units"] }); toast.success("已删除"); }, onError: (e: unknown) => toast.error(getErrorMessage(e)) });
  const createWordMut = useMutation({ mutationFn: (d: Record<string, unknown>) => apiClient.post("/vocab/words", { ...d, unitId: selectedUnit?.id }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["vocab-words"] }); toast.success("已添加"); setWordDialog(false); }, onError: (e: unknown) => toast.error(getErrorMessage(e)) });
  const updateWordMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => apiClient.patch(`/vocab/words/${id}`, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["vocab-words"] }); toast.success("已保存"); setWordDialog(false); }, onError: (e: unknown) => toast.error(getErrorMessage(e)) });
  const deleteWordMut = useMutation({ mutationFn: (id: string) => apiClient.delete(`/vocab/words/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["vocab-words"] }); toast.success("已删除"); }, onError: (e: unknown) => toast.error(getErrorMessage(e)) });

  const aiExerciseMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => apiClient.post<{ data: { content: string; isTemplate: boolean; note?: string } }>("/ai/exercise", d),
    onSuccess: (res) => { setAiResult(res.data.content); toast.success(res.data.note || "练习题已生成"); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });

  function openImport() {
    setImportUnitId(selectedUnit?.id ?? "");
    setNewUnitName("");
    setImportOpen(true);
  }

  async function handleImport(rows: Record<string, string>[], mode: "append" | "upsert") {
    const res = await apiClient.post<{
      data: {
        unitId: string; unitName: string; created: number; updated: number; skipped: number;
        errors: { index: number; message: string }[];
      };
    }>("/import/vocab", {
      unitId: importUnitId || undefined,
      unitName: importUnitId ? undefined : newUnitName,
      rows,
      mode,
    });
    const { created, updated, skipped, errors, unitId, unitName } = res.data;
    qc.invalidateQueries({ queryKey: ["vocab-units"] });
    qc.invalidateQueries({ queryKey: ["vocab-words"] });
    toast.success(`导入到「${unitName}」：新增 ${created} 词${updated ? `，更新 ${updated} 词` : ""}${skipped ? `，跳过重复 ${skipped} 词` : ""}`);
    if (errors?.length) toast.warning(`${errors.length} 行数据有误已忽略`);
    setSelectedUnit({ id: unitId, name: unitName, textbookVersion: null, gradeLevel: null });
  }

  async function handleExport() {
    setExporting(true);
    try {
      const path = selectedUnit ? `/export/vocab?unitId=${selectedUnit.id}` : "/export/vocab";
      await downloadExport(path, `${selectedUnit ? selectedUnit.name : "词汇表"}.xlsx`);
      toast.success("已导出 Excel");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "导出失败"));
    } finally {
      setExporting(false);
    }
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) { toast.error("浏览器不支持语音合成"); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    speechSynthesis.speak(u);
  }

  function openCreateWord() { setEditingWord(null); setWordForm({ word: "", meaning: "", phoneticUs: "", partOfSpeech: "", exampleEn: "", exampleZh: "" }); setWordDialog(true); }
  function openEditWord(w: VocabWord) { setEditingWord(w); setWordForm({ word: w.word, meaning: w.meaning ?? "", phoneticUs: w.phoneticUs ?? "", partOfSpeech: w.partOfSpeech ?? "", exampleEn: w.exampleEn ?? "", exampleZh: w.exampleZh ?? "" }); setWordDialog(true); }

  async function handleWordSubmit() {
    if (!wordForm.word.trim()) { toast.error("单词不能为空"); return; }
    if (editingWord) await updateWordMut.mutateAsync({ id: editingWord.id, data: wordForm });
    else await createWordMut.mutateAsync(wordForm);
  }

  /* ── 纯展示派生 ── */
  const textbookCount = new Set(units.map((u) => u.textbookVersion).filter(Boolean)).size;
  const gradeCount = new Set(units.map((u) => u.gradeLevel).filter(Boolean)).size;

  const posCount = new Set(words.map((w) => w.partOfSpeech).filter(Boolean)).size;
  const meaningCount = words.filter((w) => w.meaning).length;
  const meaningRate = words.length ? Math.round((meaningCount / words.length) * 100) : 0;

  return (
    <div>
      <PageHeader title="词汇中心" description={selectedUnit ? `${selectedUnit.name} · 共 ${words.length} 个词条` : `共 ${units.length} 个单元`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-1.5" onClick={openImport}><Upload className="h-4 w-4" />导入 Excel</Button>
            <Button variant="outline" className="gap-1.5" onClick={handleExport} disabled={exporting}>
              <Download className="h-4 w-4" />
              {exporting ? "导出中…" : selectedUnit ? "导出本单元" : "导出全部"}
            </Button>
          </div>
        } />

      {!selectedUnit ? (
        <div>
          {/* ══════════ 概览条 ══════════ */}
          {!isLoading && units.length > 0 && (
            <StatBar
              items={[
                { label: "词汇单元", hint: "Units", value: units.length, suffix: "个" },
                { label: "教材版本", hint: "Textbooks", value: textbookCount, suffix: "种" },
                { label: "覆盖年级", hint: "Grades", value: gradeCount, suffix: "个" },
              ]}
              action={<Button onClick={() => setUnitDialog(true)} className="gap-1.5"><Plus className="h-4 w-4" />新建单元</Button>}
            />
          )}

          {isLoading ? (
            <Card><CardContent><LoadingState /></CardContent></Card>
          ) : units.length === 0 ? (
            <Card><CardContent>
              <EmptyState
                icon={<BookOpen className="h-10 w-10" />}
                title="暂无词汇单元"
                description="新建单元或从 Excel 导入词表，之后即可生成听写与练习"
                action={<Button onClick={() => setUnitDialog(true)} className="gap-1.5"><Plus className="h-4 w-4" />新建单元</Button>}
              />
            </CardContent></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {units.map((u, i) => (
                <Card key={u.id} className="group">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -bottom-4 right-1 z-0 select-none font-display text-[56px] font-semibold leading-none text-[#5e9f7e]/[0.10] transition-colors duration-[var(--dur-smooth)] group-hover:text-[#5e9f7e]/[0.18]"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <button onClick={() => setSelectedUnit(u)} className="relative z-[1] block w-full p-5 pr-11 text-left">
                    <span className="flex items-start gap-3">
                      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-[#e4f0e8] to-[#d5e8dc] text-[#3d7a5e] ring-1 ring-inset ring-[#5e9f7e]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform duration-[var(--dur-smooth)] ease-[var(--ease-spring)] group-hover:scale-105">
                        <span className="pointer-events-none absolute inset-1.5 rounded-lg grid-veil opacity-50" />
                        <BookOpen className="relative h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-serif text-[19px] font-semibold leading-tight tracking-[0.01em]">{u.name}</span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {u.textbookVersion && <Badge variant="muted">{u.textbookVersion}</Badge>}
                          {u.gradeLevel && <Badge variant="outline">{u.gradeLevel}</Badge>}
                        </span>
                        <span className="mt-2 flex items-center gap-1 text-[11px] text-muted">
                          打开单元词表
                          <ChevronRight className="h-3 w-3 transition-transform duration-[var(--dur-quick)] group-hover:translate-x-0.5 group-hover:text-primary" />
                        </span>
                      </span>
                    </span>
                  </button>
                  <IconButton label={`删除单元「${u.name}」`} tone="danger" onClick={() => deleteUnitMut.mutate(u.id)}
                    className="absolute right-1.5 top-1.5 z-[2]">
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] opacity-0 transition-opacity duration-[var(--dur-smooth)] group-hover:opacity-80"
                    style={{ backgroundImage: "linear-gradient(90deg, #5e9f7ecc, #5e9f7e00)" }} />
                </Card>
              ))}
            </div>
          )}

          {/* ══════════ 词汇工作流 ══════════ */}
          {!isLoading && units.length > 0 && (
            <section className="reveal relative mt-4 overflow-hidden rounded-2xl edge-lit spotlight shadow-[0_2px_14px_-4px_rgba(36,35,31,0.10)]">
              <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(112deg,#fbfdfb_0%,#fbf8f4_42%,#f5f7fa_78%,#f2f8f5_100%)]" />
              <span className="pointer-events-none absolute inset-0 dot-veil opacity-[0.22]" />
              <span className="pointer-events-none absolute -left-16 -bottom-20 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(94,159,126,0.16),transparent_68%)]" />
              <div className="relative p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="eyebrow">Workflow</p>
                    <p className="mt-1 font-serif text-[17px] font-semibold text-text">从词表到听写，三步走</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setUnitDialog(true)}>
                    <Plus className="h-3.5 w-3.5" />新建单元
                  </Button>
                </div>
                <ol className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    { n: "01", title: "新建单元", desc: "按教材版本与年级归档，一单元一张卡片", icon: BookOpen },
                    { n: "02", title: "导入词表", desc: "Excel 批量导入或手动添加，自动识别重复词", icon: Upload },
                    { n: "03", title: "生成练习", desc: "一键听写出题，或让 AI 按词表生成练习", icon: Sparkles },
                  ].map((st) => {
                    const StepIcon = st.icon;
                    return (
                      <li key={st.n} className="group relative overflow-hidden rounded-xl border border-white/70 bg-white/55 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-sm transition-transform duration-[var(--dur-quick)] hover:-translate-y-[1px]">
                        <span aria-hidden className="num-display pointer-events-none absolute -right-1 -top-3 select-none text-[44px] font-semibold leading-none text-[#3d7a5e]/[0.09]">{st.n}</span>
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-b from-[#e4f0e8] to-[#d5e8dc] text-[#3d7a5e] ring-1 ring-inset ring-[#5e9f7e]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                          <StepIcon className="h-4 w-4" />
                        </span>
                        <p className="mt-2.5 text-sm font-medium leading-tight text-text">{st.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted">{st.desc}</p>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* ══════════ 玻璃工具条：返回 + 单元操作 ══════════ */}
          <GlassToolbar className="mb-0 justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
              <button onClick={() => setSelectedUnit(null)}
                className="group inline-flex items-center gap-1 rounded-full bg-panel px-2.5 py-1 text-xs text-neutral-6 ring-1 ring-inset ring-line shadow-[var(--shadow-xs)] transition-all duration-[var(--dur-quick)] hover:-translate-x-[1px] hover:text-primary-d">
                <ChevronRight className="h-3.5 w-3.5 rotate-180" />返回单元列表
              </button>
              <span className="hidden h-4 w-px bg-line sm:block" />
              <h3 className="truncate font-serif text-[17px] tracking-[0.01em]">{selectedUnit.name}</h3>
              <Badge variant="muted" className="tabular-nums">{words.length} 词</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" className="gap-1.5"
                onClick={() => aiExerciseMut.mutate({ unitId: selectedUnit.id, exerciseType: aiExerciseType, count: 10 })}
                disabled={aiExerciseMut.isPending || words.length === 0}>
                <Sparkles className="h-3.5 w-3.5" />{aiExerciseMut.isPending ? "出题中…" : "AI 出题"}
              </Button>
            </div>
          </GlassToolbar>

          {/* ══════════ 概览条 ══════════ */}
          {!isLoading && words.length > 0 && (
            <StatBar
              items={[
                { label: "词条总数", hint: "Words", value: words.length, suffix: "词" },
                { label: "词性种类", hint: "Parts of Speech", value: posCount, suffix: "类" },
                { label: "已配释义", hint: "Meaning", value: meaningCount, suffix: "词" },
                { label: "释义完整率", hint: "Completeness", value: meaningRate, suffix: "%" },
              ]}
              action={<Button onClick={openCreateWord} className="gap-1.5"><Plus className="h-4 w-4" />添加单词</Button>}
            />
          )}

          {/* ══════════ 词条列表 ══════════ */}
          <Card>
            <SectionHeader icon={BookOpen} title="单元词表" en="Word List" tone="wakatake"
              right={<span className="tabular-nums">共 {words.length} 词</span>} />
            <CardContent className="p-0">
              {words.length === 0 ? (
                <EmptyState
                  icon={<BookOpen className="h-10 w-10" />}
                  title="暂无单词"
                  description="手动添加或从 Excel 导入本单元词表"
                  action={<Button onClick={openCreateWord} className="gap-1.5"><Plus className="h-4 w-4" />添加单词</Button>}
                />
              ) : (
                <div className="divide-y divide-line/60">
                  {words.map((w, i) => (
                    <div key={w.id} className="group relative flex min-h-[64px] items-start gap-3 p-4 transition-[background] duration-[var(--dur-quick)] hover:bg-[linear-gradient(90deg,rgba(197,100,115,0.06),rgba(197,100,115,0.02)_58%,transparent)]">
                      <span className="absolute inset-y-2 left-0 w-[2px] rounded-full opacity-0 transition-opacity duration-[var(--dur-quick)] group-hover:opacity-100"
                        style={{ backgroundImage: "linear-gradient(180deg, #5e9f7ecc, #5e9f7e00)" }} />
                      {/* 序号 + 首字母字块 */}
                      <span className="w-6 shrink-0 pt-1 text-right">
                        <span className="num-display text-[11px] font-semibold tabular-nums text-neutral-4">{String(i + 1).padStart(2, "0")}</span>
                      </span>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-[#e4f0e8] to-[#d5e8dc] font-serif text-sm font-semibold uppercase text-[#3d7a5e] ring-1 ring-inset ring-[#5e9f7e]/20 transition-transform duration-[var(--dur-smooth)] ease-[var(--ease-spring)] group-hover:scale-105">
                        {w.word.slice(0, 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-serif text-[17px] font-semibold tracking-[0.01em]">{w.word}</span>
                          <IconButton label={`朗读「${w.word}」`} onClick={() => speak(w.word)}
                            className="h-7 w-7 rounded-md text-primary hover:bg-[#f8e4e7]/70 hover:text-primary-d">
                            <Volume2 className="h-3.5 w-3.5" />
                          </IconButton>
                          {w.phoneticUs && <span className="text-xs text-muted">/{w.phoneticUs}/</span>}
                          {w.partOfSpeech && <Badge variant="muted">{w.partOfSpeech}</Badge>}
                        </div>
                        {w.meaning && <p className="mt-1 text-sm text-neutral-7">{w.meaning}</p>}
                        {w.exampleEn && <p className="mt-1 text-xs italic text-neutral-6">{w.exampleEn}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <IconButton label={`编辑「${w.word}」`} onClick={() => openEditWord(w)}><Pencil className="h-4 w-4" /></IconButton>
                        <IconButton label={`删除「${w.word}」`} tone="danger" onClick={() => deleteWordMut.mutate(w.id)}><Trash2 className="h-4 w-4" /></IconButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={!!aiResult} onClose={() => setAiResult(null)} title="AI 生成练习题" className="max-w-2xl">
        {aiResult && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <select value={aiExerciseType} onChange={(e) => setAiExerciseType(e.target.value)} className="flex h-8 rounded-md border border-line bg-panel px-2 text-xs">
                <option value="mixed">混合题型</option>
                <option value="choice">选择题</option>
                <option value="fill">填空题</option>
                <option value="match">匹配题</option>
                <option value="sentence">造句题</option>
              </select>
              <Button variant="outline" size="sm" className="gap-1.5"
                onClick={() => { try { navigator.clipboard?.writeText(aiResult); toast.success("已复制"); } catch { toast.error("复制失败"); } }}>
                <Copy className="h-3.5 w-3.5" />复制
              </Button>
              <Button variant="secondary" size="sm" className="gap-1.5"
                onClick={() => aiExerciseMut.mutate({ unitId: selectedUnit?.id, exerciseType: aiExerciseType, count: 10 })}
                disabled={aiExerciseMut.isPending}>
                <Sparkles className="h-3.5 w-3.5" />重新生成
              </Button>
            </div>
            <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-lg bg-neutral-1/60 p-4 text-sm leading-relaxed">{aiResult}</pre>
          </div>
        )}
      </Dialog>

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        kind="vocab"
        title="导入单词"
        target="支持中英文表头，重复单词可选择跳过或更新"
        confirmLabel="导入单词"
        onConfirm={handleImport}
        extra={
          <div className="space-y-2 rounded-md border border-line p-3">
            <Label>导入到</Label>
            <select
              value={importUnitId}
              onChange={(e) => { setImportUnitId(e.target.value); setNewUnitName(""); }}
              className="flex h-9 w-full rounded-md border border-line bg-panel px-3 text-sm"
            >
              <option value="">＋ 新建单元</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            {!importUnitId && (
              <Input
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
                placeholder="新单元名称，如 Unit 3"
              />
            )}
          </div>
        }
      />

      <Dialog open={unitDialog} onClose={() => setUnitDialog(false)} title="新建词汇单元">
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>单元名称 *</Label><Input value={unitForm.name} onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })} placeholder="如 Unit 1" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>教材版本</Label><Input value={unitForm.textbookVersion} onChange={(e) => setUnitForm({ ...unitForm, textbookVersion: e.target.value })} placeholder="如 人教版" /></div>
            <div className="space-y-1.5"><Label>年级</Label><Input value={unitForm.gradeLevel} onChange={(e) => setUnitForm({ ...unitForm, gradeLevel: e.target.value })} placeholder="如 高一" /></div>
          </div>
          <Button onClick={async () => { if (!unitForm.name.trim()) { toast.error("名称不能为空"); return; } await createUnitMut.mutateAsync(unitForm); }} disabled={createUnitMut.isPending} className="w-full">创建</Button>
        </div>
      </Dialog>

      <Dialog open={wordDialog} onClose={() => setWordDialog(false)} title={editingWord ? "编辑单词" : "添加单词"} className="max-w-xl">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>单词 *</Label><Input value={wordForm.word} onChange={(e) => setWordForm({ ...wordForm, word: e.target.value })} /></div>
            <div className="space-y-1"><Label>美式音标</Label><Input value={wordForm.phoneticUs} onChange={(e) => setWordForm({ ...wordForm, phoneticUs: e.target.value })} placeholder="如 /ɪkˈsplɔːr/" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>中文释义</Label><Input value={wordForm.meaning} onChange={(e) => setWordForm({ ...wordForm, meaning: e.target.value })} /></div>
            <div className="space-y-1"><Label>词性</Label><Input value={wordForm.partOfSpeech} onChange={(e) => setWordForm({ ...wordForm, partOfSpeech: e.target.value })} placeholder="如 v." /></div>
          </div>
          <div className="space-y-1"><Label>英文例句</Label><Textarea value={wordForm.exampleEn} onChange={(e) => setWordForm({ ...wordForm, exampleEn: e.target.value })} rows={2} /></div>
          <div className="space-y-1"><Label>中文例句</Label><Textarea value={wordForm.exampleZh} onChange={(e) => setWordForm({ ...wordForm, exampleZh: e.target.value })} rows={2} /></div>
          <Button onClick={handleWordSubmit} disabled={createWordMut.isPending || updateWordMut.isPending} className="w-full">保存</Button>
        </div>
      </Dialog>
    </div>
  );
}
