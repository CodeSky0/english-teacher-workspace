"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
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
import { downloadExport } from "@/lib/excel/client";
import {
  Plus, Trash2, Headphones, ChevronRight, Volume2, Upload, Download,
  Check, X, Search, Library, Loader2, GraduationCap, Printer,
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";

const ImportDialog = dynamic(() => import("@/components/common/import-dialog").then((m) => m.ImportDialog), {
  ssr: false,
});
import { cn } from "@/lib/utils";

type DictList = { id: string; name: string; classId: string | null; dictationDate: string | null };
type DictWord = { id: string; word: string; meaning: string | null };
type Student = { id: string; name: string; studentNo: string | null; seatNo: number | null };
type DictResult = { id: string; listId: string; studentId: string; wordId: string; isCorrect: boolean | null };
type VocabUnitOption = { id: string; name: string };

type CellValue = boolean | null;

const cellKey = (studentId: string, wordId: string) => `${studentId}:${wordId}`;

function accuracyText(correct: number, total: number): string {
  if (!total) return "—";
  return `${((correct / total) * 100).toFixed(0)}%`;
}

export default function DictationPage() {
  const { currentClass } = useCurrentClass();
  const { classes } = useClasses();
  const qc = useQueryClient();

  const [selectedList, setSelectedList] = useState<DictList | null>(null);
  const [tab, setTab] = useState<"words" | "scores">("words");
  const [listDialog, setListDialog] = useState(false);
  const [wordDialog, setWordDialog] = useState(false);
  const [listForm, setListForm] = useState({ name: "", classId: "", dictationDate: "" });
  const [wordForm, setWordForm] = useState({ word: "", meaning: "" });

  // 导入
  const [importOpen, setImportOpen] = useState(false);
  const [unitImportOpen, setUnitImportOpen] = useState(false);
  const [unitImportId, setUnitImportId] = useState("");
  const [unitImporting, setUnitImporting] = useState(false);
  const [exporting, setExporting] = useState<"" | "list" | "summary">("");
  const [printOpen, setPrintOpen] = useState(false);
  const [printMode, setPrintMode] = useState<"blank" | "meaning">("blank");
  const [printCopies, setPrintCopies] = useState(1);
  const [wrongExporting, setWrongExporting] = useState(false);

  // 成绩录入
  const [scoreClassId, setScoreClassId] = useState("");
  const [studentFilter, setStudentFilter] = useState("");
  const [grid, setGrid] = useState<Record<string, CellValue>>({});
  const [saving, setSaving] = useState(false);
  const pendingRef = useRef<Record<string, { studentId: string; wordId: string; isCorrect: CellValue }>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: listsData, isLoading } = useQuery({
    queryKey: ["dict-lists"],
    queryFn: () => apiClient.get<{ data: DictList[] }>("/dictation/lists"),
  });
  const lists = listsData?.data ?? [];

  const { data: wordsData } = useQuery({
    queryKey: ["dict-words", selectedList?.id],
    queryFn: () => apiClient.get<{ data: DictWord[] }>(`/dictation/words?listId=${selectedList?.id}`),
    enabled: !!selectedList,
  });
  const words = useMemo(() => wordsData?.data ?? [], [wordsData]);

  const { data: unitsData } = useQuery({
    queryKey: ["vocab-units"],
    queryFn: () => apiClient.get<{ data: VocabUnitOption[] }>("/vocab/units"),
    enabled: unitImportOpen,
  });
  const vocabUnits = unitsData?.data ?? [];

  const effectiveClassId = scoreClassId || selectedList?.classId || currentClass?.id || "";

  const { data: studentsData } = useQuery({
    queryKey: ["students", effectiveClassId],
    queryFn: () => apiClient.get<{ data: Student[] }>(`/students?classId=${effectiveClassId}`),
    enabled: !!effectiveClassId && !!selectedList,
  });
  const students = useMemo(() => {
    const rows = studentsData?.data ?? [];
    return rows.slice().sort((a, b) => {
      const sa = a.seatNo ?? Number.MAX_SAFE_INTEGER;
      const sb = b.seatNo ?? Number.MAX_SAFE_INTEGER;
      if (sa !== sb) return sa - sb;
      return a.name.localeCompare(b.name, "zh-CN");
    });
  }, [studentsData]);

  const { data: resultsData } = useQuery({
    queryKey: ["dict-results", selectedList?.id],
    queryFn: () => apiClient.get<{ data: DictResult[] }>(`/dictation/lists/${selectedList?.id}/results`),
    enabled: !!selectedList && tab === "scores",
  });
  const results = useMemo(() => resultsData?.data ?? [], [resultsData]);

  // 服务端数据 -> 本地网格（有未保存改动时不覆盖）
  useEffect(() => {
    if (Object.keys(pendingRef.current).length > 0) return;
    const next: Record<string, CellValue> = {};
    for (const r of results) next[cellKey(r.studentId, r.wordId)] = r.isCorrect;
    setGrid(next);
  }, [results]);

  // 切换词表时重置临时状态
  useEffect(() => {
    setGrid({});
    pendingRef.current = {};
    setStudentFilter("");
    setTab("words");
    if (selectedList?.classId) setScoreClassId(selectedList.classId);
    else if (currentClass?.id) setScoreClassId(currentClass.id);
  }, [selectedList?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const flush = useCallback(async () => {
    if (!selectedList) return;
    const items = Object.values(pendingRef.current);
    if (items.length === 0) return;
    pendingRef.current = {};
    setSaving(true);
    try {
      await apiClient.post(`/dictation/lists/${selectedList.id}/results`, { results: items });
      qc.invalidateQueries({ queryKey: ["dict-results", selectedList.id] });
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "成绩保存失败，将在下次编辑时重试"));
      for (const it of items) {
        const k = cellKey(it.studentId, it.wordId);
        if (!(k in pendingRef.current)) pendingRef.current[k] = it;
      }
    } finally {
      setSaving(false);
    }
  }, [selectedList, qc]);

  function scheduleFlush() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, 400);
  }

  function setCell(studentId: string, wordId: string, value: CellValue) {
    const key = cellKey(studentId, wordId);
    setGrid((prev) => ({ ...prev, [key]: value }));
    pendingRef.current[key] = { studentId, wordId, isCorrect: value };
    scheduleFlush();
  }

  function toggleCell(studentId: string, wordId: string) {
    const current = grid[cellKey(studentId, wordId)] ?? null;
    const next: CellValue = current === null ? true : current === true ? false : null;
    setCell(studentId, wordId, next);
  }

  function fillStudent(studentId: string, value: CellValue) {
    const next = { ...grid };
    for (const w of words) {
      const key = cellKey(studentId, w.id);
      next[key] = value;
      pendingRef.current[key] = { studentId, wordId: w.id, isCorrect: value };
    }
    setGrid(next);
    scheduleFlush();
  }

  function fillAll(value: CellValue) {
    const next = { ...grid };
    for (const s of students) {
      for (const w of words) {
        const key = cellKey(s.id, w.id);
        next[key] = value;
        pendingRef.current[key] = { studentId: s.id, wordId: w.id, isCorrect: value };
      }
    }
    setGrid(next);
    scheduleFlush();
    toast.success(value === true ? "已标记全班全对" : "已清空本次成绩");
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const createListMut = useMutation({ mutationFn: (d: Record<string, unknown>) => apiClient.post("/dictation/lists", d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["dict-lists"] }); toast.success("已创建"); setListDialog(false); }, onError: (e: unknown) => toast.error(getErrorMessage(e)) });
  const deleteListMut = useMutation({ mutationFn: (id: string) => apiClient.delete(`/dictation/lists/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["dict-lists"] }); toast.success("已删除"); setSelectedList(null); }, onError: (e: unknown) => toast.error(getErrorMessage(e)) });
  const createWordMut = useMutation({ mutationFn: (d: Record<string, unknown>) => apiClient.post("/dictation/words", { ...d, listId: selectedList?.id }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["dict-words"] }); toast.success("已添加"); setWordDialog(false); }, onError: (e: unknown) => toast.error(getErrorMessage(e)) });
  const deleteWordMut = useMutation({ mutationFn: (id: string) => apiClient.delete(`/dictation/words/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["dict-words"] }); toast.success("已删除"); }, onError: (e: unknown) => toast.error(getErrorMessage(e)) });

  const filteredStudents = useMemo(() => {
    if (!studentFilter.trim()) return students;
    const kw = studentFilter.toLowerCase();
    return students.filter(
      (s) => s.name.toLowerCase().includes(kw) || (s.studentNo ?? "").toLowerCase().includes(kw)
    );
  }, [students, studentFilter]);

  const studentStats = useMemo(() => {
    return new Map(
      students.map((s) => {
        let correct = 0;
        let recorded = 0;
        for (const w of words) {
          const v = grid[cellKey(s.id, w.id)] ?? null;
          if (v === true) { correct++; recorded++; }
          else if (v === false) recorded++;
        }
        return [s.id, { correct, recorded, total: words.length }];
      })
    );
  }, [students, words, grid]);

  const wordStats = useMemo(() => {
    return new Map(
      words.map((w) => {
        let wrong = 0;
        let recorded = 0;
        for (const s of students) {
          const v = grid[cellKey(s.id, w.id)] ?? null;
          if (v === true) recorded++;
          else if (v === false) { recorded++; wrong++; }
        }
        return [w.id, { wrong, recorded }];
      })
    );
  }, [words, students, grid]);

  const classSummary = useMemo(() => {
    let correct = 0;
    let recorded = 0;
    for (const s of students) {
      const st = studentStats.get(s.id);
      if (!st) continue;
      correct += st.correct;
      recorded += st.recorded;
    }
    return { correct, recorded, avg: recorded ? Math.round((correct / recorded) * 1000) / 10 : null };
  }, [students, studentStats]);

  function speak(text: string) {
    if (!("speechSynthesis" in window)) { toast.error("浏览器不支持语音合成"); return; }
    const u = new SpeechSynthesisUtterance(text); u.lang = "en-US"; speechSynthesis.speak(u);
  }

  async function handleImportWords(rows: Record<string, string>[], mode: "append" | "upsert") {
    if (!selectedList) return;
    const res = await apiClient.post<{ data: { created: number; updated: number; skipped: number } }>(
      "/import/dictation-words",
      { listId: selectedList.id, rows, mode }
    );
    qc.invalidateQueries({ queryKey: ["dict-words", selectedList.id] });
    const { created, updated, skipped } = res.data;
    toast.success(`导入完成：新增 ${created} 词${updated ? `，更新 ${updated} 词` : ""}${skipped ? `，跳过重复 ${skipped} 词` : ""}`);
  }

  async function handleImportFromUnit() {
    if (!selectedList || !unitImportId) return;
    setUnitImporting(true);
    try {
      const res = await apiClient.get<{ data: { word: string; meaning: string | null }[] }>(
        `/vocab/words?unitId=${unitImportId}`
      );
      const rows = (res.data ?? []).map((w) => ({ word: w.word, meaning: w.meaning ?? "" }));
      if (rows.length === 0) { toast.warning("该单元没有单词"); return; }
      await handleImportWords(rows, "append");
      setUnitImportOpen(false);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "导入失败"));
    } finally {
      setUnitImporting(false);
    }
  }

  async function handleExportWrongWords() {
    const targetClass = currentClass?.id;
    if (!targetClass) {
      toast.error("请先在左侧选择一个班级");
      return;
    }
    setWrongExporting(true);
    try {
      await downloadExport(
        `/export/wrong-words?classId=${targetClass}&minCount=1`,
        `错词本_${currentClass?.name ?? ""}_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      toast.success("已导出错词本");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "导出失败"));
    } finally {
      setWrongExporting(false);
    }
  }

  async function handleExport(scope: "list" | "summary") {
    if (!selectedList) return;
    setExporting(scope);
    try {
      if (scope === "list") {
        await downloadExport(`/export/dictation/${selectedList.id}`, `听写成绩_${selectedList.name}.xlsx`);
      } else {
        if (!effectiveClassId) { toast.error("请先选择班级"); return; }
        await downloadExport(`/export/dictation-summary?classId=${effectiveClassId}`, "历次听写汇总.xlsx");
      }
      toast.success("已导出 Excel");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "导出失败"));
    } finally {
      setExporting("");
    }
  }

  return (
    <div>
      <PageHeader title="听写词表" description={`共 ${lists.length} 张词表`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-1.5" onClick={handleExportWrongWords} disabled={wrongExporting}>
              <Download className="h-4 w-4" />
              {wrongExporting ? "导出中…" : "错词本"}
            </Button>
            <Button onClick={() => { setListForm({ name: "", classId: currentClass?.id ?? "", dictationDate: "" }); setListDialog(true); }} className="gap-1.5"><Plus className="h-4 w-4" />新建词表</Button>
          </div>
        } />

      {!selectedList ? (
        <Card><CardContent className="p-0">
          {isLoading ? <LoadingState /> : lists.length === 0 ? <EmptyState icon={<Headphones className="h-10 w-10" />} title="暂无听写词表" description="新建词表后可导入单词并录入成绩" /> :
            <div className="divide-y divide-line">
              {lists.map((l) => (
                <div key={l.id} className="group flex items-center gap-3.5 p-4 pl-5 transition-[background] duration-[var(--dur-quick)] hover:bg-gradient-to-r hover:from-[#f8e4e7]/55 hover:via-[#f8e4e7]/12 hover:to-transparent">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.5rem] bg-gradient-to-b from-[#f8e4e7] to-[#f2d6da] text-primary-d ring-1 ring-inset ring-[#c56473]/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                    <Headphones className="h-[18px] w-[18px]" />
                  </span>
                  <button onClick={() => setSelectedList(l)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <span className="truncate font-medium tracking-[0.01em]">{l.name}</span>
                    <Badge variant="muted">{l.classId ? (classes.find((c) => c.id === l.classId)?.name ?? "已删除班级") : "未关联班级"}</Badge>
                    {l.dictationDate && <Badge variant="muted">{l.dictationDate}</Badge>}
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform duration-[var(--dur-quick)] group-hover:translate-x-0.5 group-hover:text-primary" />
                  </button>
                  <button onClick={() => deleteListMut.mutate(l.id)} title="删除"
                    className="rounded-md p-1.5 text-muted opacity-55 transition-all duration-[var(--dur-quick)] hover:bg-[#f8e4e7] hover:text-[#a64953] hover:shadow-[var(--shadow-xs)] group-hover:opacity-100">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>}
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <button onClick={() => setSelectedList(null)}
                className="group inline-flex items-center gap-1 rounded-full bg-panel px-2.5 py-1 text-xs text-neutral-6 ring-1 ring-inset ring-line shadow-[var(--shadow-xs)] transition-all duration-[var(--dur-quick)] hover:-translate-x-[1px] hover:text-primary-d hover:shadow-[var(--shadow-sm)]">
                <ChevronRight className="h-3.5 w-3.5 rotate-180 transition-transform duration-[var(--dur-quick)] group-hover:-translate-x-0.5" />
                返回
              </button>
              <h3 className="font-serif text-[17px] tracking-[0.01em]">{selectedList.name}</h3>
              <Badge variant="muted">{words.length} 词</Badge>
              {saving && <span className="flex items-center gap-1 text-xs text-muted"><Loader2 className="h-3 w-3 animate-spin" />保存中…</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex gap-0.5 rounded-lg border border-line/70 bg-neutral-2/55 p-0.5 shadow-[inset_0_1px_2px_rgba(36,35,31,0.05)]">
                <button
                  onClick={() => setTab("words")}
                  className={cn(
                    "rounded-[0.4rem] px-3 py-1 text-xs transition-all duration-[var(--dur-quick)] ease-[var(--ease-smooth)]",
                    tab === "words"
                      ? "bg-white font-medium text-primary-d shadow-[0_1px_2px_rgba(36,35,31,0.10),inset_0_1px_0_rgba(255,255,255,0.9)]"
                      : "text-muted hover:text-text"
                  )}
                >
                  单词管理
                </button>
                <button
                  onClick={() => setTab("scores")}
                  className={cn(
                    "rounded-[0.4rem] px-3 py-1 text-xs transition-all duration-[var(--dur-quick)] ease-[var(--ease-smooth)]",
                    tab === "scores"
                      ? "bg-white font-medium text-primary-d shadow-[0_1px_2px_rgba(36,35,31,0.10),inset_0_1px_0_rgba(255,255,255,0.9)]"
                      : "text-muted hover:text-text"
                  )}
                >
                  成绩录入
                </button>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" />导入单词</Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setUnitImportId(""); setUnitImportOpen(true); }}><Library className="h-4 w-4" />从词汇单元导入</Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExport("list")} disabled={exporting !== ""}>
                <Download className="h-4 w-4" />
                {exporting === "list" ? "导出中…" : "导出成绩"}
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExport("summary")} disabled={exporting !== ""}>
                <GraduationCap className="h-4 w-4" />
                {exporting === "summary" ? "导出中…" : "历次汇总"}
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setPrintOpen(true)} disabled={words.length === 0}>
                <Printer className="h-4 w-4" />
                打印听写纸
              </Button>
            </div>
          </div>

          {tab === "words" ? (
            <Card><CardContent className="p-0">
              {words.length === 0 ? <EmptyState title="暂无单词" description="可手动添加、Excel 导入或从词汇单元一键导入" /> :
                <div className="divide-y divide-line">
                  {words.map((w, i) => (
                    <div key={w.id} className="flex items-center justify-between p-4 transition-colors duration-[var(--dur-quick)] hover:bg-gradient-to-r hover:from-[#f8e4e7]/50 hover:to-transparent">
                      <div className="flex items-center gap-2">
                        <span className="w-6 text-xs text-muted">{i + 1}</span>
                        <span className="font-medium">{w.word}</span>
                        <button onClick={() => speak(w.word)} className="text-primary hover:text-primary-d"><Volume2 className="h-4 w-4" /></button>
                        {w.meaning && <span className="text-sm text-muted">{w.meaning}</span>}
                      </div>
                      <button onClick={() => deleteWordMut.mutate(w.id)} className="text-muted hover:text-[#a64953]"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>}
              <div className="border-t border-line p-3">
                <Button size="sm" className="gap-1.5" onClick={() => { setWordForm({ word: "", meaning: "" }); setWordDialog(true); }}><Plus className="h-4 w-4" />添加单词</Button>
              </div>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              <Card>
                <CardContent className="flex flex-wrap items-end gap-3 py-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted">听写班级</Label>
                    <select
                      value={effectiveClassId}
                      onChange={(e) => setScoreClassId(e.target.value)}
                      className="flex h-9 rounded-md border border-line bg-panel px-3 text-sm"
                    >
                      <option value="">选择班级</option>
                      {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted">搜索学生</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted" />
                      <Input
                        value={studentFilter}
                        onChange={(e) => setStudentFilter(e.target.value)}
                        placeholder="姓名 / 学号"
                        className="h-9 w-40 pl-8"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => fillAll(true)}>全班全对</Button>
                    <Button size="sm" variant="outline" onClick={() => fillAll(null)}>清空成绩</Button>
                  </div>
                  {classSummary.avg != null && (
                    <div className="ml-auto flex items-center gap-4 text-sm">
                      <span className="text-muted">已批改 <b className="text-text">{classSummary.recorded}</b> 格</span>
                      <span className="text-muted">全班正确率 <b className="text-primary">{classSummary.avg}%</b></span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card><CardContent className="p-0">
                {words.length === 0 ? <EmptyState title="请先添加听写单词" /> :
                 students.length === 0 ? <EmptyState title="该班级暂无学生" description="请先在学生管理中添加或导入学生" /> :
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="table-head border-b border-line text-left text-xs text-muted">
                          <th className="sticky left-0 z-10 bg-panel px-3 py-2 font-medium">学生</th>
                          {words.map((w) => {
                            const st = wordStats.get(w.id);
                            return (
                              <th key={w.id} className="min-w-[64px] px-1 py-2 text-center font-medium">
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="font-serif text-[13px] text-text">{w.word}</span>
                                  {st && st.recorded > 0 && (
                                    <span className={cn(
                                      "rounded px-1 text-[10px] tabular-nums",
                                      st.wrong / st.recorded >= 0.4 ? "bg-[#f7dfe0] text-[#a64953]" : "bg-neutral-2 text-muted",
                                    )}>
                                      错 {st.wrong}/{st.recorded}
                                    </span>
                                  )}
                                </div>
                              </th>
                            );
                          })}
                          <th className="px-3 py-2 text-center font-medium">正确</th>
                          <th className="px-3 py-2 text-center font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((st) => {
                          const stat = studentStats.get(st.id);
                          return (
                            <tr key={st.id} className="border-b border-line/50 transition-colors duration-[var(--dur-quick)] hover:bg-gradient-to-r hover:from-[#f8e4e7]/50 hover:to-transparent">
                              <td className="sticky left-0 z-10 bg-panel px-3 py-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{st.name}</span>
                                  {st.seatNo != null && <span className="text-xs text-muted">{st.seatNo}号</span>}
                                </div>
                              </td>
                              {words.map((w) => {
                                const v = grid[cellKey(st.id, w.id)] ?? null;
                                return (
                                  <td key={w.id} className="px-1 py-1.5 text-center">
                                    <button
                                      onClick={() => toggleCell(st.id, w.id)}
                                      className={cn(
                                        "group/cell flex h-7 w-12 items-center justify-center rounded-md border text-xs",
                                        "transition-all duration-[var(--dur-quick)] ease-[var(--ease-smooth)]",
                                        "hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.96]",
                                        v === true && "border-[#5e9f7e]/45 bg-gradient-to-b from-[#e4f0e8] to-[#d5e8dc] text-[#3d7a5e] shadow-[0_1px_2px_rgba(94,159,126,0.28),inset_0_1px_0_rgba(255,255,255,0.9)]",
                                        v === false && "border-[#a64953]/45 bg-gradient-to-b from-[#f7dfe0] to-[#f0cfd1] text-[#a64953] shadow-[0_1px_2px_rgba(166,73,83,0.24),inset_0_1px_0_rgba(255,255,255,0.85)]",
                                        v === null && "border-dashed border-line bg-panel text-muted hover:border-[#c56473]/50 hover:bg-[#f8e4e7]/45 hover:text-primary-d",
                                      )}
                                      title="点击切换：正确 / 错误 / 未批改"
                                    >
                                      {v === true ? <Check className="h-3.5 w-3.5" /> : v === false ? <X className="h-3.5 w-3.5" /> :
                                        <span className="h-1 w-1 rounded-full bg-[#dcd9d1] transition-colors duration-[var(--dur-quick)] group-hover/cell:bg-[#c56473]/60" />}
                                    </button>
                                  </td>
                                );
                              })}
                              <td className="px-3 py-1.5 text-center">
                                <div className="flex items-baseline justify-center gap-0.5">
                                  <span className="font-serif text-[15px] font-semibold tabular-nums text-primary-d">{stat?.correct ?? 0}</span>
                                  <span className="text-xs tabular-nums text-muted">/{stat?.recorded ?? 0}</span>
                                </div>
                                <div className="text-[11px] tabular-nums text-muted">{accuracyText(stat?.correct ?? 0, stat?.recorded ?? 0)}</div>
                              </td>
                              <td className="px-3 py-1.5">
                                <div className="flex gap-1">
                                  <button onClick={() => fillStudent(st.id, true)}
                                    className="rounded-md px-1.5 py-0.5 text-[10px] text-muted ring-1 ring-inset ring-line transition-colors duration-[var(--dur-quick)] hover:bg-[#e4f0e8] hover:text-[#3d7a5e]">全对</button>
                                  <button onClick={() => fillStudent(st.id, null)}
                                    className="rounded-md px-1.5 py-0.5 text-[10px] text-muted ring-1 ring-inset ring-line transition-colors duration-[var(--dur-quick)] hover:bg-[#f7dfe0] hover:text-[#a64953]">清空</button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>}
              </CardContent></Card>
              <p className="text-xs text-muted">点击格子循环切换「正确 → 错误 → 未批改」，改动会自动保存（约 0.4 秒后写入）。</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={printOpen} onClose={() => setPrintOpen(false)} title="打印听写纸">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-4 rounded-md border border-line bg-bg/40 p-3 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={printMode === "blank"} onChange={() => setPrintMode("blank")} />
              只留空（听写用）
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={printMode === "meaning"} onChange={() => setPrintMode("meaning")} />
              带中文释义（复习单）
            </label>
            <label className="flex items-center gap-1.5 text-muted">
              份数
              <Input
                type="number"
                min={1}
                max={60}
                value={printCopies}
                onChange={(e) => setPrintCopies(Math.min(60, Math.max(1, Number(e.target.value) || 1)))}
                className="h-8 w-16"
              />
            </label>
          </div>

          <div className="max-h-[46vh] overflow-auto rounded-md border border-line bg-white">
            <div id="print-root" className="p-6 text-black">
              {Array.from({ length: printCopies }).map((_, copyIdx) => (
                <div key={copyIdx} className={copyIdx > 0 ? "mt-8 border-t border-dashed border-black/30 pt-8" : ""}>
                  <div className="mb-4 flex items-end justify-between border-b border-black pb-2">
                    <div>
                      <div className="text-lg font-bold">{selectedList?.name}</div>
                      <div className="mt-0.5 text-xs text-black/70">
                        {selectedList?.dictationDate ? `日期：${selectedList.dictationDate}` : "日期：__________"}
                      </div>
                    </div>
                    <div className="flex items-end gap-4 text-sm">
                      <span>班级：__________</span>
                      <span>姓名：__________</span>
                      <span>得分：__________</span>
                    </div>
                  </div>
                  <table className="w-full border-collapse text-sm">
                    <tbody>
                      {words.map((w, i) => (
                        <tr key={w.id} className="border-b border-black/10">
                          <td className="w-10 py-2 align-top text-black/60">{i + 1}.</td>
                          <td className="w-[38%] py-2 align-top">
                            {printMode === "meaning" ? (
                              <span className="font-medium">{w.meaning || w.word}</span>
                            ) : null}
                          </td>
                          <td className="py-2 align-top">
                            <div className="h-6 border-b border-black/30" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-4 text-xs text-black/60">共 {words.length} 词</p>
                </div>
              ))}
            </div>
          </div>

          <Button className="w-full gap-1.5" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />打印
          </Button>
          <p className="text-xs text-muted">打印时只会输出上方白色区域，可直接用浏览器「另存为 PDF」。</p>
        </div>
      </Dialog>

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

      <Dialog open={unitImportOpen} onClose={() => setUnitImportOpen(false)} title="从词汇单元导入">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>词汇单元</Label>
            <select value={unitImportId} onChange={(e) => setUnitImportId(e.target.value)} className="flex h-9 w-full rounded-md border border-line bg-panel px-3 text-sm">
              <option value="">请选择</option>
              {vocabUnits.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <p className="text-xs text-muted">导入后会自动跳过与当前词表重复的单词。</p>
          <Button onClick={handleImportFromUnit} disabled={!unitImportId || unitImporting} className="w-full">
            {unitImporting ? "导入中…" : "导入该单元单词"}
          </Button>
        </div>
      </Dialog>

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        kind="dictation-words"
        title="导入听写单词"
        target={`导入到：${selectedList?.name ?? ""}`}
        confirmLabel="导入单词"
        onConfirm={handleImportWords}
      />
    </div>
  );
}
