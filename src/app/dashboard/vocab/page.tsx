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
import { downloadExport } from "@/lib/excel/client";
import { Plus, Pencil, Trash2, BookOpen, Volume2, ChevronRight, Upload, Download } from "lucide-react";
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

  return (
    <div>
      <PageHeader title="词汇中心" description={`共 ${units.length} 个单元`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-1.5" onClick={openImport}><Upload className="h-4 w-4" />导入 Excel</Button>
            <Button variant="outline" className="gap-1.5" onClick={handleExport} disabled={exporting}>
              <Download className="h-4 w-4" />
              {exporting ? "导出中…" : selectedUnit ? "导出本单元" : "导出全部"}
            </Button>
            <Button onClick={() => setUnitDialog(true)} className="gap-1.5"><Plus className="h-4 w-4" />新建单元</Button>
          </div>
        } />

      {!selectedUnit ? (
        <Card><CardContent className="p-0">
          {isLoading ? <LoadingState /> : units.length === 0 ? <EmptyState icon={<BookOpen className="h-10 w-10" />} title="暂无词汇单元" /> :
            <div className="divide-y divide-line">
              {units.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-4 hover:bg-bg/50">
                  <button onClick={() => setSelectedUnit(u)} className="flex flex-1 items-center gap-2 text-left">
                    <span className="font-medium">{u.name}</span>
                    {u.gradeLevel && <Badge variant="muted">{u.gradeLevel}</Badge>}
                    <ChevronRight className="h-4 w-4 text-muted" />
                  </button>
                  <button onClick={() => deleteUnitMut.mutate(u.id)} className="text-muted hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>}
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedUnit(null)} className="text-sm text-primary hover:underline">← 返回单元列表</button>
              <span className="text-muted">|</span>
              <h3 className="font-semibold">{selectedUnit.name}</h3>
              <Badge variant="muted">{words.length} 词</Badge>
            </div>
            <Button onClick={openCreateWord} size="sm" className="gap-1.5"><Plus className="h-4 w-4" />添加单词</Button>
          </div>
          <Card><CardContent className="p-0">
            {words.length === 0 ? <EmptyState title="暂无单词" /> :
              <div className="divide-y divide-line">
                {words.map((w) => (
                  <div key={w.id} className="flex items-start justify-between p-4 hover:bg-bg/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-base">{w.word}</span>
                        <button onClick={() => speak(w.word)} className="text-primary hover:text-primary-d"><Volume2 className="h-4 w-4" /></button>
                        {w.phoneticUs && <span className="text-xs text-muted">/{w.phoneticUs}/</span>}
                        {w.partOfSpeech && <Badge variant="muted">{w.partOfSpeech}</Badge>}
                      </div>
                      {w.meaning && <p className="mt-1 text-sm text-muted">{w.meaning}</p>}
                      {w.exampleEn && <p className="mt-1 text-xs italic text-muted">{w.exampleEn}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEditWord(w)} className="text-muted hover:text-primary"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => deleteWordMut.mutate(w.id)} className="text-muted hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>}
          </CardContent></Card>
        </div>
      )}

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
