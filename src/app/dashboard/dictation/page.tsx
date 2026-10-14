"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCurrentClass, useClasses } from "@/hooks/use-classes";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { Plus, Trash2, Headphones, ChevronRight, Volume2 } from "lucide-react";
import { toast } from "sonner";

type DictList = { id: string; name: string; classId: string | null; dictationDate: string | null };
type DictWord = { id: string; listId: string; word: string; meaning: string | null };

export default function DictationPage() {
  const { currentClass } = useCurrentClass();
  const { classes } = useClasses();
  const qc = useQueryClient();
  const [selectedList, setSelectedList] = useState<DictList | null>(null);
  const [listDialog, setListDialog] = useState(false);
  const [wordDialog, setWordDialog] = useState(false);
  const [listForm, setListForm] = useState({ name: "", classId: "", dictationDate: "" });
  const [wordForm, setWordForm] = useState({ word: "", meaning: "" });

  const { data: listsData, isLoading } = useQuery({ queryKey: ["dict-lists"], queryFn: () => apiClient.get<{ data: DictList[] }>("/dictation/lists") });
  const lists = listsData?.data ?? [];

  const { data: wordsData } = useQuery({
    queryKey: ["dict-words", selectedList?.id],
    queryFn: () => apiClient.get<{ data: DictWord[] }>(`/dictation/words?listId=${selectedList?.id}`),
    enabled: !!selectedList,
  });
  const words = wordsData?.data ?? [];

  const createListMut = useMutation({ mutationFn: (d: any) => apiClient.post("/dictation/lists", d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["dict-lists"] }); toast.success("已创建"); setListDialog(false); }, onError: (e: any) => toast.error(e.message) });
  const deleteListMut = useMutation({ mutationFn: (id: string) => apiClient.delete(`/dictation/lists/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["dict-lists"] }); toast.success("已删除"); }, onError: (e: any) => toast.error(e.message) });
  const createWordMut = useMutation({ mutationFn: (d: any) => apiClient.post("/dictation/words", { ...d, listId: selectedList?.id }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["dict-words"] }); toast.success("已添加"); setWordDialog(false); }, onError: (e: any) => toast.error(e.message) });
  const deleteWordMut = useMutation({ mutationFn: (id: string) => apiClient.delete(`/dictation/words/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["dict-words"] }); toast.success("已删除"); }, onError: (e: any) => toast.error(e.message) });

  function speak(text: string) {
    if (!("speechSynthesis" in window)) { toast.error("浏览器不支持语音合成"); return; }
    const u = new SpeechSynthesisUtterance(text); u.lang = "en-US"; speechSynthesis.speak(u);
  }

  return (
    <div>
      <PageHeader title="听写词表" description={`共 ${lists.length} 张词表`}
        action={<Button onClick={() => { setListForm({ name: "", classId: currentClass?.id ?? "", dictationDate: "" }); setListDialog(true); }} className="gap-1.5"><Plus className="h-4 w-4" />新建词表</Button>} />

      {!selectedList ? (
        <Card><CardContent className="p-0">
          {isLoading ? <LoadingState /> : lists.length === 0 ? <EmptyState icon={<Headphones className="h-10 w-10" />} title="暂无听写词表" /> :
            <div className="divide-y divide-line">
              {lists.map((l) => (
                <div key={l.id} className="flex items-center justify-between p-4 hover:bg-bg/50">
                  <button onClick={() => setSelectedList(l)} className="flex flex-1 items-center gap-2 text-left">
                    <span className="font-medium">{l.name}</span>
                    {l.dictationDate && <Badge variant="muted">{l.dictationDate}</Badge>}
                    <ChevronRight className="h-4 w-4 text-muted" />
                  </button>
                  <button onClick={() => deleteListMut.mutate(l.id)} className="text-muted hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>}
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedList(null)} className="text-sm text-primary hover:underline">← 返回</button>
              <span className="text-muted">|</span>
              <h3 className="font-semibold">{selectedList.name}</h3>
              <Badge variant="muted">{words.length} 词</Badge>
            </div>
            <Button onClick={() => { setWordForm({ word: "", meaning: "" }); setWordDialog(true); }} size="sm" className="gap-1.5"><Plus className="h-4 w-4" />添加单词</Button>
          </div>
          <Card><CardContent className="p-0">
            {words.length === 0 ? <EmptyState title="暂无单词" /> :
              <div className="divide-y divide-line">
                {words.map((w) => (
                  <div key={w.id} className="flex items-center justify-between p-4 hover:bg-bg/50">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{w.word}</span>
                      <button onClick={() => speak(w.word)} className="text-primary hover:text-primary-d"><Volume2 className="h-4 w-4" /></button>
                      {w.meaning && <span className="text-sm text-muted">{w.meaning}</span>}
                    </div>
                    <button onClick={() => deleteWordMut.mutate(w.id)} className="text-muted hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>}
          </CardContent></Card>
        </div>
      )}

      <Dialog open={listDialog} onClose={() => setListDialog(false)} title="新建听写词表">
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>名称 *</Label><Input value={listForm.name} onChange={(e) => setListForm({ ...listForm, name: e.target.value })} placeholder="如 Unit 1 听写" /></div>
          <div className="space-y-1.5"><Label>班级</Label>
            <select value={listForm.classId} onChange={(e) => setListForm({ ...listForm, classId: e.target.value })} className="flex h-9 w-full rounded-md border border-line bg-panel px-3 text-sm">
              <option value="">无</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label>听写日期</Label><Input type="date" value={listForm.dictationDate} onChange={(e) => setListForm({ ...listForm, dictationDate: e.target.value })} /></div>
          <Button onClick={async () => { if (!listForm.name.trim()) { toast.error("名称不能为空"); return; } await createListMut.mutateAsync({ ...listForm, classId: listForm.classId || null, dictationDate: listForm.dictationDate || null }); }} disabled={createListMut.isPending} className="w-full">创建</Button>
        </div>
      </Dialog>

      <Dialog open={wordDialog} onClose={() => setWordDialog(false)} title="添加单词">
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>单词 *</Label><Input value={wordForm.word} onChange={(e) => setWordForm({ ...wordForm, word: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>释义</Label><Input value={wordForm.meaning} onChange={(e) => setWordForm({ ...wordForm, meaning: e.target.value })} /></div>
          <Button onClick={async () => { if (!wordForm.word.trim()) { toast.error("单词不能为空"); return; } await createWordMut.mutateAsync(wordForm); }} disabled={createWordMut.isPending} className="w-full">添加</Button>
        </div>
      </Dialog>
    </div>
  );
}
