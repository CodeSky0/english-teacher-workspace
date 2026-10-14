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
import { Plus, Pencil, Trash2, BookOpen, Volume2, ChevronRight } from "lucide-react";
import { toast } from "sonner";

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

  const { data: unitsData, isLoading } = useQuery({ queryKey: ["vocab-units"], queryFn: () => apiClient.get<{ data: VocabUnit[] }>("/vocab/units") });
  const units = unitsData?.data ?? [];

  const { data: wordsData } = useQuery({
    queryKey: ["vocab-words", selectedUnit?.id],
    queryFn: () => apiClient.get<{ data: VocabWord[] }>(`/vocab/words?unitId=${selectedUnit?.id}`),
    enabled: !!selectedUnit,
  });
  const words = wordsData?.data ?? [];

  const createUnitMut = useMutation({ mutationFn: (d: any) => apiClient.post("/vocab/units", d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["vocab-units"] }); toast.success("已添加"); setUnitDialog(false); }, onError: (e: any) => toast.error(e.message) });
  const deleteUnitMut = useMutation({ mutationFn: (id: string) => apiClient.delete(`/vocab/units/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["vocab-units"] }); toast.success("已删除"); }, onError: (e: any) => toast.error(e.message) });
  const createWordMut = useMutation({ mutationFn: (d: any) => apiClient.post("/vocab/words", { ...d, unitId: selectedUnit?.id }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["vocab-words"] }); toast.success("已添加"); setWordDialog(false); }, onError: (e: any) => toast.error(e.message) });
  const updateWordMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.patch(`/vocab/words/${id}`, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["vocab-words"] }); toast.success("已保存"); setWordDialog(false); }, onError: (e: any) => toast.error(e.message) });
  const deleteWordMut = useMutation({ mutationFn: (id: string) => apiClient.delete(`/vocab/words/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["vocab-words"] }); toast.success("已删除"); }, onError: (e: any) => toast.error(e.message) });

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
        action={<Button onClick={() => setUnitDialog(true)} className="gap-1.5"><Plus className="h-4 w-4" />新建单元</Button>} />

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
