"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCurrentClass, useClasses } from "@/hooks/use-classes";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { MetricTile, MetricRing } from "@/components/charts/metric-tile";
import { downloadExport } from "@/lib/excel/client";
import {
  Plus, Trash2, Headphones, ChevronRight, Volume2, Upload, Download,
  Check, X, Search, Library, Loader2, GraduationCap, Printer,
  Users, BookOpen, ClipboardCheck, Gauge, CalendarDays, Monitor, Pencil, Keyboard,
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";
import {
  computeStudentScore,
  computeClassSummary,
  normalizePassRule,
  passRuleLabel,
  type PassType,
  type CellValue as ScoringCell,
} from "@/lib/dictation/scoring";

const ImportDialog = dynamic(() => import("@/components/common/import-dialog").then((m) => m.ImportDialog), {
  ssr: false,
});
import { cn } from "@/lib/utils";

type DictList = {
  id: string;
  name: string;
  classId: string | null;
  dictationDate: string | null;
  passType: PassType;
  passValue: number | null;
};
type DictWord = { id: string; word: string; meaning: string | null; scoreWeight: number };
type Student = { id: string; name: string; studentNo: string | null; seatNo: number | null };
type DictResult = { id: string; listId: string; studentId: string; wordId: string; isCorrect: boolean | null };
type VocabUnitOption = { id: string; name: string };

type CellValue = boolean | null;

const cellKey = (studentId: string, wordId: string) => `${studentId}:${wordId}`;

/** 学生头像渐变：按姓名稳定取色，与学情分析页保持一致；深色字保证对比度 */
const AVATAR_TONES = [
  { bg: "linear-gradient(160deg,#f3c6cd,#e0a3ac)", fg: "#7c3a44" },
  { bg: "linear-gradient(160deg,#c9dbeb,#a9c6df)", fg: "#2f5478" },
  { bg: "linear-gradient(160deg,#cfe6d9,#aad3bf)", fg: "#2f6349" },
  { bg: "linear-gradient(160deg,#efdcbd,#e3c795)", fg: "#6b4a20" },
  { bg: "linear-gradient(160deg,#e6d6e8,#d3b7d7)", fg: "#6b4368" },
];
function avatarTone(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

export default function DictationPage() {
  const { currentClass } = useCurrentClass();
  const { classes } = useClasses();
  const qc = useQueryClient();

  const [selectedList, setSelectedList] = useState<DictList | null>(null);
  const [tab, setTab] = useState<"words" | "scores">("words");
  const [listDialog, setListDialog] = useState(false);
  const [wordDialog, setWordDialog] = useState(false);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [listForm, setListForm] = useState({
    name: "",
    classId: "",
    dictationDate: "",
    passType: "none" as PassType,
    passValue: "",
  });
  const [wordForm, setWordForm] = useState({ word: "", meaning: "", scoreWeight: "1" });

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

  // 键盘极速录入
  const [keyboardMode, setKeyboardMode] = useState(false);
  const [activeCell, setActiveCell] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const wrongInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const cellBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const { data: listsData, isLoading } = useQuery({
    queryKey: ["dict-lists"],
    queryFn: () => apiClient.get<{ data: DictList[] }>("/dictation/lists"),
  });
  const lists = listsData?.data ?? [];

  /** 词表列表的轻量统计（纯派生，不额外请求） */
  const listSummary = useMemo(() => {
    const classIds = new Set(lists.map((l) => l.classId).filter((id): id is string => !!id));
    const dated = lists.filter((l) => l.dictationDate).sort((a, b) => (b.dictationDate ?? "").localeCompare(a.dictationDate ?? ""));
    return { classes: classIds.size, datedCount: dated.length, latest: dated[0]?.dictationDate ?? null };
  }, [lists]);

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
  }, [selectedList?.id, currentClass?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const filteredStudents = useMemo(() => {
    if (!studentFilter.trim()) return students;
    const kw = studentFilter.toLowerCase();
    return students.filter(
      (s) => s.name.toLowerCase().includes(kw) || (s.studentNo ?? "").toLowerCase().includes(kw)
    );
  }, [students, studentFilter]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  /** 错词序号框：输入 "3 5 7" → 第 3/5/7 词标错，其余标对 */
  function applyWrongIndices(studentId: string, input: string) {
    const tokens = input.split(/[\s,，、]+/).map((t) => t.trim()).filter(Boolean);
    const wrongSet = new Set<number>();
    for (const t of tokens) {
      const n = Number(t);
      if (Number.isFinite(n) && n >= 1) wrongSet.add(Math.trunc(n));
    }
    const next = { ...grid };
    words.forEach((w, i) => {
      const isWrong = wrongSet.has(i + 1);
      const key = cellKey(studentId, w.id);
      next[key] = isWrong ? false : true;
      pendingRef.current[key] = { studentId, wordId: w.id, isCorrect: next[key] };
    });
    setGrid(next);
    scheduleFlush();
  }

  /** 把活动格滚动到可视区 */
  function scrollActiveIntoView(r: number, c: number) {
    const st = filteredStudents[r];
    const w = words[c];
    if (!st || !w) return;
    const btn = cellBtnRefs.current[cellKey(st.id, w.id)];
    btn?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  // 键盘极速录入：方向键移动活动格 + 数字键标记
  useEffect(() => {
    if (!keyboardMode || tab !== "scores") return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inEditable =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if (inEditable) return;
      if (filteredStudents.length === 0 || words.length === 0) return;

      const { r, c } = activeCell;
      const maxR = filteredStudents.length - 1;
      const maxC = words.length - 1;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        const nr = Math.max(0, r - 1);
        setActiveCell({ r: nr, c });
        scrollActiveIntoView(nr, c);
      } else if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        const nr = Math.min(maxR, r + 1);
        setActiveCell({ r: nr, c });
        scrollActiveIntoView(nr, c);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const nc = Math.max(0, c - 1);
        setActiveCell({ r, c: nc });
        scrollActiveIntoView(r, nc);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const nc = Math.min(maxC, c + 1);
        setActiveCell({ r, c: nc });
        scrollActiveIntoView(r, nc);
      } else if (e.key === "1" || e.key === "y" || e.key === "Y") {
        e.preventDefault();
        const st = filteredStudents[r];
        const w = words[c];
        if (st && w) setCell(st.id, w.id, true);
      } else if (e.key === "0" || e.key === "n" || e.key === "N") {
        e.preventDefault();
        const st = filteredStudents[r];
        const w = words[c];
        if (st && w) setCell(st.id, w.id, false);
      } else if (e.key === "." || e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        const st = filteredStudents[r];
        const w = words[c];
        if (st && w) setCell(st.id, w.id, null);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [keyboardMode, tab, activeCell, filteredStudents, words]); // eslint-disable-line react-hooks/exhaustive-deps

  // 切换班级/筛选时把活动格 clamp 回有效范围
  useEffect(() => {
    setActiveCell((prev) => ({
      r: Math.min(prev.r, Math.max(0, filteredStudents.length - 1)),
      c: Math.min(prev.c, Math.max(0, words.length - 1)),
    }));
  }, [filteredStudents.length, words.length]);

  const createListMut = useMutation({ mutationFn: (d: Record<string, unknown>) => apiClient.post("/dictation/lists", d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["dict-lists"] }); toast.success("已创建"); setListDialog(false); }, onError: (e: unknown) => toast.error(getErrorMessage(e)) });
  const editListMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => apiClient.patch(`/dictation/lists/${id}`, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["dict-lists"] }); toast.success("已更新"); setListDialog(false); }, onError: (e: unknown) => toast.error(getErrorMessage(e)) });
  const deleteListMut = useMutation({ mutationFn: (id: string) => apiClient.delete(`/dictation/lists/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["dict-lists"] }); toast.success("已删除"); setSelectedList(null); }, onError: (e: unknown) => toast.error(getErrorMessage(e)) });
  const createWordMut = useMutation({ mutationFn: (d: Record<string, unknown>) => apiClient.post("/dictation/words", { ...d, listId: selectedList?.id }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["dict-words"] }); toast.success("已添加"); setWordDialog(false); }, onError: (e: unknown) => toast.error(getErrorMessage(e)) });
  const updateWordMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => apiClient.patch(`/dictation/words/${id}`, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["dict-words"] }); toast.success("已更新"); setWordDialog(false); }, onError: (e: unknown) => toast.error(getErrorMessage(e)) });
  const deleteWordMut = useMutation({ mutationFn: (id: string) => apiClient.delete(`/dictation/words/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["dict-words"] }); toast.success("已删除"); }, onError: (e: unknown) => toast.error(getErrorMessage(e)) });

  const passRule = useMemo(
    () => normalizePassRule(selectedList?.passType ?? "none", selectedList?.passValue ?? null),
    [selectedList?.passType, selectedList?.passValue]
  );

  const studentStats = useMemo(() => {
    return new Map(
      students.map((s) => {
        const studentResults: Record<string, ScoringCell> = {};
        for (const w of words) studentResults[w.id] = grid[cellKey(s.id, w.id)] ?? null;
        const score = computeStudentScore(
          words.map((w) => ({ id: w.id, scoreWeight: w.scoreWeight })),
          studentResults,
          passRule
        );
        const correct = score.recordedCount - score.wrongCount;
        return [s.id, {
          correct,
          recorded: score.recordedCount,
          total: words.length,
          score,
        }] as const;
      })
    );
  }, [students, words, grid, passRule]);

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
    const cs = computeClassSummary(
      words.map((w) => ({ id: w.id, scoreWeight: w.scoreWeight })),
      students,
      grid,
      cellKey
    );
    return {
      correct: cs.correctWeight,
      recorded: cs.recordedCount,
      avg: cs.avgPct != null ? Math.round(cs.avgPct * 10) / 10 : null,
    };
  }, [students, words, grid]);

  function speak(text: string) {
    if (!("speechSynthesis" in window)) { toast.error("浏览器不支持语音合成"); return; }
    speechSynthesis.cancel();
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

  function openEditList(l: DictList) {
    setEditingListId(l.id);
    setListForm({
      name: l.name,
      classId: l.classId ?? "",
      dictationDate: l.dictationDate ?? "",
      passType: l.passType ?? "none",
      passValue: l.passValue != null ? String(l.passValue) : "",
    });
    setListDialog(true);
  }

  function openNewList() {
    setEditingListId(null);
    setListForm({ name: "", classId: currentClass?.id ?? "", dictationDate: "", passType: "none", passValue: "" });
    setListDialog(true);
  }

  function openEditWord(w: DictWord) {
    setEditingWordId(w.id);
    setWordForm({ word: w.word, meaning: w.meaning ?? "", scoreWeight: String(w.scoreWeight ?? 1) });
    setWordDialog(true);
  }

  function openNewWord() {
    setEditingWordId(null);
    setWordForm({ word: "", meaning: "", scoreWeight: "1" });
    setWordDialog(true);
  }

  async function submitListForm() {
    if (!listForm.name.trim()) { toast.error("名称不能为空"); return; }
    const payload = {
      name: listForm.name.trim(),
      classId: listForm.classId || null,
      dictationDate: listForm.dictationDate || null,
      passType: listForm.passType,
      passValue: listForm.passType === "none" ? null : (Number(listForm.passValue) || 0),
    };
    if (editingListId) {
      await editListMut.mutateAsync({ id: editingListId, data: payload });
    } else {
      await createListMut.mutateAsync(payload);
    }
  }

  async function submitWordForm() {
    if (!wordForm.word.trim()) { toast.error("单词不能为空"); return; }
    const payload = {
      word: wordForm.word.trim(),
      meaning: wordForm.meaning.trim() || null,
      scoreWeight: Math.max(0, Math.trunc(Number(wordForm.scoreWeight)) || 1),
    };
    if (editingWordId) {
      await updateWordMut.mutateAsync({ id: editingWordId, data: payload });
    } else {
      await createWordMut.mutateAsync(payload);
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
            <Button onClick={openNewList} className="gap-1.5"><Plus className="h-4 w-4" />新建词表</Button>
          </div>
        } />

      {!selectedList ? (
        <>
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/70 bg-white/60 px-3.5 py-2.5 shadow-[0_1px_2px_rgba(36,35,31,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md">
          <span className="inline-flex items-center gap-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[linear-gradient(160deg,#faeef0,#f3dde1)] text-primary-d ring-1 ring-inset ring-primary/15"><Headphones className="h-3 w-3" /></span>
            <span className="text-[11px] text-muted">共 <b className="tabular-nums text-text">{lists.length}</b> 张词表</span>
          </span>
          <span className="h-3 w-px bg-line" />
          <span className="text-[11px] text-muted">覆盖 <b className="tabular-nums text-text">{listSummary.classes}</b> 个班级</span>
          <span className="h-3 w-px bg-line" />
          <span className="text-[11px] text-muted">已排日期 <b className="tabular-nums text-text">{listSummary.datedCount}</b> 张</span>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2 py-0.5 text-[11px] text-neutral-6 ring-1 ring-inset ring-line/70">
            <CalendarDays className="h-3 w-3 text-neutral-5" />
            最近听写 <span className="tabular-nums text-text">{listSummary.latest ?? "—"}</span>
          </span>
        </div>
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="eyebrow text-neutral-6">Dictation Lists</p>
                <CardTitle className="mt-1.5 flex items-center gap-2 text-[15px]">
                  <span className="icon-slot"><Headphones /></span>
                  全部词表
                  <Badge variant="muted">{lists.length} 张</Badge>
                </CardTitle>
              </div>
              <p className="text-[11px] text-muted">选择一张词表开始录入单词，或进入成绩批改</p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? <LoadingState /> : lists.length === 0 ? <EmptyState icon={<Headphones className="h-10 w-10" />} title="暂无听写词表" description="新建词表后可导入单词并录入成绩" /> :
              <div className="divide-y divide-line/70">
                {lists.map((l) => (
                  <div key={l.id} className="group relative flex items-center gap-3.5 p-4 pl-5 transition-colors duration-[var(--dur-quick)] hover:bg-gradient-to-r hover:from-[#f8e4e7]/55 hover:via-[#f8e4e7]/12 hover:to-transparent">
                    <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-gradient-to-b from-[#d1707f] to-[#e0a3ac] opacity-0 transition-opacity duration-[var(--dur-quick)] group-hover:opacity-100" />
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.6rem] bg-gradient-to-b from-[#f8e4e7] to-[#f2d6da] text-primary-d ring-1 ring-inset ring-[#c56473]/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-transform duration-[var(--dur-smooth)] ease-[var(--ease-spring)] group-hover:scale-105">
                      <Headphones className="h-[18px] w-[18px]" />
                    </span>
                    <button onClick={() => setSelectedList(l)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                      <span className="truncate font-medium tracking-[0.01em] transition-colors duration-[var(--dur-quick)] group-hover:text-primary-d">{l.name}</span>
                      <Badge variant="muted">{l.classId ? (classes.find((c) => c.id === l.classId)?.name ?? "已删除班级") : "未关联班级"}</Badge>
                      {l.passType && l.passType !== "none" && (
                        <span className="hidden items-center gap-1 rounded-md bg-[#f0ede4]/70 px-1.5 py-[1px] text-[10px] text-[#6b4a20] ring-1 ring-inset ring-[#c9a96a]/30 sm:inline-flex">
                          {passRuleLabel(normalizePassRule(l.passType, l.passValue))}
                        </span>
                      )}
                      {l.dictationDate && (
                        <span className="hidden items-center gap-1 rounded-md bg-white/70 px-1.5 py-[1px] text-[10px] tabular-nums text-neutral-6 ring-1 ring-inset ring-line/70 sm:inline-flex">
                          {l.dictationDate}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-all duration-[var(--dur-quick)] group-hover:translate-x-0.5 group-hover:text-primary" />
                    </button>
                    <button onClick={() => openEditList(l)} title="编辑词表" aria-label={`编辑词表 ${l.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted opacity-55 transition-all duration-[var(--dur-quick)] hover:bg-[#f8e4e7] hover:text-primary-d hover:shadow-[var(--shadow-xs)] group-hover:opacity-100">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteListMut.mutate(l.id)} title="删除" aria-label={`删除词表 ${l.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted opacity-55 transition-all duration-[var(--dur-quick)] hover:bg-[#f8e4e7] hover:text-[#a64953] hover:shadow-[var(--shadow-xs)] group-hover:opacity-100">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>}
          </CardContent>
        </Card>
        </>
      ) : (
        <div className="space-y-4">
          <div className="spotlight relative overflow-hidden rounded-xl border border-white/70 bg-[linear-gradient(115deg,#fff7f7,#fbf8f4_46%,#f5f7fa)] px-3.5 py-2.5 shadow-[0_1px_2px_rgba(36,35,31,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]">
            <div className="pointer-events-none absolute inset-0 grid-veil opacity-30" />
            <div className="relative flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <button onClick={() => setSelectedList(null)}
                className="group inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-xs text-neutral-6 ring-1 ring-inset ring-line shadow-[var(--shadow-xs)] transition-all duration-[var(--dur-quick)] hover:-translate-x-[1px] hover:text-primary-d hover:shadow-[var(--shadow-sm)]">
                <ChevronRight className="h-3.5 w-3.5 rotate-180 transition-transform duration-[var(--dur-quick)] group-hover:-translate-x-0.5" />
                返回
              </button>
              <h3 className="font-serif text-[18px] tracking-[0.01em]">{selectedList.name}</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[11px] text-neutral-6 ring-1 ring-inset ring-line/70">
                <Headphones className="h-3 w-3" />
                {words.length} 词
              </span>
              {selectedList.passType && selectedList.passType !== "none" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#f0ede4]/80 px-2 py-0.5 text-[11px] text-[#6b4a20] ring-1 ring-inset ring-[#c9a96a]/30">
                  {passRuleLabel(passRule)}
                </span>
              )}
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
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open(`/dictation/${selectedList.id}/present`, "_blank")} disabled={words.length === 0}>
                <Monitor className="h-4 w-4" />
                大屏展示
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={openEditList ? () => openEditList(selectedList) : undefined}>
                <Pencil className="h-4 w-4" />
                编辑
              </Button>
            </div>
            </div>
          </div>

          {tab === "words" ? (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="eyebrow text-neutral-6">Word List</p>
                    <CardTitle className="mt-1.5 flex items-center gap-2 text-[15px]">
                      <span className="icon-slot"><BookOpen /></span>
                      单词管理
                      <Badge variant="muted">{words.length} 词</Badge>
                    </CardTitle>
                  </div>
                  <p className="text-[11px] text-muted">点击喇叭试听发音 · 单词将同步用于听写纸与成绩录入</p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {words.length === 0 ? <EmptyState title="暂无单词" description="可手动添加、Excel 导入或从词汇单元一键导入" /> :
                  <div className="divide-y divide-line/70">
                    {words.map((w, i) => (
                      <div key={w.id} className="group flex items-center justify-between gap-3 px-4 py-2.5 transition-colors duration-[var(--dur-quick)] hover:bg-gradient-to-r hover:from-[#f8e4e7]/50 hover:to-transparent">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="num-display w-6 shrink-0 text-right text-[11px] font-semibold tabular-nums text-neutral-4">{String(i + 1).padStart(2, "0")}</span>
                          <span className="font-display text-[17px] font-medium tracking-[0.01em] transition-colors duration-[var(--dur-quick)] group-hover:text-primary-d">{w.word}</span>
                          <button
                            onClick={() => speak(w.word)}
                            title="播放发音"
                            aria-label={`播放发音 ${w.word}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-primary ring-1 ring-inset ring-primary/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-[var(--dur-quick)] hover:bg-[#f8e4e7] hover:shadow-glow"
                          >
                            <Volume2 className="h-3.5 w-3.5" />
                          </button>
                          {w.meaning && <span className="truncate text-xs text-muted">{w.meaning}</span>}
                          <span className="inline-flex items-center rounded-md bg-[#f0ede4]/70 px-1.5 py-[1px] text-[10px] font-medium tabular-nums text-[#6b4a20] ring-1 ring-inset ring-[#c9a96a]/25">
                            {w.scoreWeight ?? 1} 分
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditWord(w)} title="编辑单词" aria-label={`编辑单词 ${w.word}`} className="flex h-8 w-8 items-center justify-center rounded-md text-muted opacity-0 transition-all duration-[var(--dur-quick)] hover:bg-[#f8e4e7] hover:text-primary-d group-hover:opacity-100"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => deleteWordMut.mutate(w.id)} title="删除单词" aria-label={`删除单词 ${w.word}`} className="flex h-8 w-8 items-center justify-center rounded-md text-muted opacity-0 transition-all duration-[var(--dur-quick)] hover:bg-[#f8e4e7] hover:text-[#a64953] group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>}
                <div className="flex items-center justify-between border-t border-line/70 p-3">
                  <Button size="sm" className="gap-1.5" onClick={openNewWord}><Plus className="h-4 w-4" />添加单词</Button>
                  <span className="text-[11px] text-muted">共 {words.length} 个单词</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {/* ══════════ 统计区：KPI + 正确率环 ══════════ */}
              <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricTile index={0} label="听写学生" hint="Students" value={students.length} suffix="人" icon={Users} tone="hanada" />
                <MetricTile index={1} label="听写单词" hint="Words" value={words.length} suffix="词" icon={BookOpen} tone="kuchiba" />
                <MetricTile index={2} label="已批改格子" hint="Recorded" value={classSummary.recorded} suffix="格" icon={ClipboardCheck} tone="sumi" />
                <MetricRing index={3} label="全班正确率" hint="Accuracy" value={classSummary.avg ?? 0} icon={Gauge} tone="wakatake" from="#9ccbb2" to="#3d7a5e" />
              </div>

              {/* 批量操作条：玻璃化 */}
              <div className="flex flex-wrap items-end gap-3 rounded-xl border border-white/70 bg-[linear-gradient(160deg,rgba(255,255,255,0.85),rgba(249,248,245,0.7))] px-3.5 py-2.5 shadow-[0_1px_2px_rgba(36,35,31,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted">听写班级</Label>
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
                  <Label className="text-[11px] text-muted">搜索学生</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted" />
                    <Input
                      value={studentFilter}
                      onChange={(e) => setStudentFilter(e.target.value)}
                      placeholder="姓名 / 学号"
                      className="h-9 w-40 pl-8 bg-white/70"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted">键盘录入</Label>
                  <button
                    onClick={() => setKeyboardMode((v) => !v)}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm transition-all duration-[var(--dur-quick)]",
                      keyboardMode
                        ? "border-[#c56473]/40 bg-[#f8e4e7] text-primary-d shadow-[0_1px_2px_rgba(197,100,115,0.18),inset_0_1px_0_rgba(255,255,255,0.9)]"
                        : "border-line bg-white/70 text-muted hover:border-[#c56473]/30 hover:text-primary-d"
                    )}
                  >
                    <Keyboard className="h-3.5 w-3.5" />
                    {keyboardMode ? "已开启" : "关闭"}
                  </button>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <span className="hidden text-[11px] text-muted sm:inline">批量标记：</span>
                  <Button size="sm" variant="outline" className="gap-1.5 bg-white/70 backdrop-blur-md" onClick={() => fillAll(true)}>
                    <Check className="h-3.5 w-3.5 text-[#3d7a5e]" />全班全对
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 bg-white/70 backdrop-blur-md" onClick={() => fillAll(null)}>
                    <X className="h-3.5 w-3.5 text-[#a64953]" />清空成绩
                  </Button>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="eyebrow text-neutral-6">Score Grid</p>
                      <CardTitle className="mt-1.5 flex items-center gap-2 text-[15px]">
                        <span className="icon-slot"><ClipboardCheck /></span>
                        成绩批改
                        <Badge variant="muted">{filteredStudents.length} / {students.length} 人</Badge>
                      </CardTitle>
                    </div>
                    <p className="text-[11px] text-muted">{keyboardMode ? "键盘：方向键移动 · 1=对 · 0=错 · .=清除 · Enter=下一行" : "点击格子：正确 → 错误 → 未批改，自动保存"}</p>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {words.length === 0 ? <EmptyState title="请先添加听写单词" description="切换到「单词管理」添加或导入单词" /> :
                   students.length === 0 ? <EmptyState title="该班级暂无学生" description="请先在学生管理中添加或导入学生" /> :
                    <div className="overflow-x-auto scrollbar-thin">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="table-head border-b border-line text-left text-xs text-muted">
                            <th className="sticky left-0 z-10 bg-panel px-3 py-2.5 font-medium">学生</th>
                            {words.map((w) => {
                              const st = wordStats.get(w.id);
                              const ratio = st && st.recorded > 0 ? st.wrong / st.recorded : 0;
                              const tone = ratio >= 0.4
                                ? { bg: "linear-gradient(160deg,#f9e3e4,#f2cfd2)", color: "#a64953", ring: "rgba(166,73,83,0.18)" }
                                : ratio >= 0.2
                                  ? { bg: "linear-gradient(160deg,#f7efe2,#efe2cd)", color: "#8a6230", ring: "rgba(168,122,61,0.18)" }
                                  : { bg: "linear-gradient(160deg,#f2f1ed,#eae8e2)", color: "#787670", ring: "rgba(120,118,112,0.14)" };
                              return (
                                <th key={w.id} className="min-w-[66px] px-1 py-2.5 text-center font-medium">
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="font-display text-[14px] font-medium leading-none text-text">{w.word}</span>
                                    {st && st.recorded > 0 && (
                                      <span
                                        className="rounded-full px-1.5 py-[1px] text-[10px] tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] ring-1 ring-inset"
                                        style={{ backgroundImage: tone.bg, color: tone.color }}
                                      >
                                        错 {st.wrong}/{st.recorded}
                                      </span>
                                    )}
                                  </div>
                                </th>
                              );
                            })}
                            <th className="px-3 py-2.5 text-center font-medium">得分</th>
                            <th className="px-3 py-2.5 text-center font-medium">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStudents.map((st, rowIdx) => {
                            const stat = studentStats.get(st.id);
                            const score = stat?.score;
                            const pct = score?.scorePct != null ? Math.round(score.scorePct) : 0;
                            const barGrad = pct >= 85
                              ? "linear-gradient(90deg,#9ccbb2,#4a8f74)"
                              : pct >= 60
                                ? "linear-gradient(90deg,#e3a5ae,#c56473)"
                                : "linear-gradient(90deg,#e0a3ac,#a64953)";
                            const tone = avatarTone(st.name);
                            const statusBadge =
                              score?.status === "pass" ? { text: "及格", cls: "bg-[#e4f0e8] text-[#3d7a5e] ring-[#5e9f7e]/25" } :
                              score?.status === "fail" ? { text: "不及格", cls: "bg-[#f7dfe0] text-[#a64953] ring-[#a64953]/25" } :
                              score?.status === "pending" ? { text: "待完成", cls: "bg-white/70 text-muted ring-line" } : null;
                            return (
                              <tr key={st.id} className="group border-b border-line/50 transition-colors duration-[var(--dur-quick)] hover:bg-gradient-to-r hover:from-[#f8e4e7]/50 hover:to-transparent">
                                <td className="sticky left-0 z-10 bg-panel px-3 py-1.5">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-serif text-[11px] ring-1 ring-inset ring-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition-transform duration-[var(--dur-smooth)] ease-[var(--ease-spring)] group-hover:scale-105"
                                      style={{ backgroundImage: tone.bg, color: tone.fg }}
                                    >
                                      {st.name.slice(0, 1)}
                                    </span>
                                    <span className="font-medium">{st.name}</span>
                                    {st.seatNo != null && <span className="text-[10px] text-muted">{st.seatNo}号</span>}
                                  </div>
                                </td>
                                {words.map((w, colIdx) => {
                                  const v = grid[cellKey(st.id, w.id)] ?? null;
                                  const isActive = keyboardMode && activeCell.r === rowIdx && activeCell.c === colIdx;
                                  return (
                                    <td key={w.id} className="px-1 py-1.5 text-center">
                                      <button
                                        ref={(el) => { cellBtnRefs.current[cellKey(st.id, w.id)] = el; }}
                                        onClick={() => toggleCell(st.id, w.id)}
                                        className={cn(
                                          "group/cell flex h-7 w-11 items-center justify-center rounded-md border text-xs",
                                          "transition-all duration-[var(--dur-quick)] ease-[var(--ease-smooth)]",
                                          "hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.96]",
                                          v === true && "border-[#5e9f7e]/45 bg-gradient-to-b from-[#e4f0e8] to-[#d5e8dc] text-[#3d7a5e] shadow-[0_1px_2px_rgba(94,159,126,0.28),inset_0_1px_0_rgba(255,255,255,0.9)]",
                                          v === false && "border-[#a64953]/45 bg-gradient-to-b from-[#f7dfe0] to-[#f0cfd1] text-[#a64953] shadow-[0_1px_2px_rgba(166,73,83,0.24),inset_0_1px_0_rgba(255,255,255,0.85)]",
                                          v === null && "border-dashed border-line bg-panel text-muted hover:border-[#c56473]/50 hover:bg-[#f8e4e7]/45 hover:text-primary-d",
                                          isActive && "ring-2 ring-[#c56473] ring-offset-1 ring-offset-panel",
                                        )}
                                        title="点击切换：正确 / 错误 / 未批改"
                                        aria-label="切换批改状态：正确 / 错误 / 未批改"
                                      >
                                        {v === true ? <Check className="h-3.5 w-3.5" /> : v === false ? <X className="h-3.5 w-3.5" /> :
                                          <span className="h-1 w-1 rounded-full bg-[#dcd9d1] transition-colors duration-[var(--dur-quick)] group-hover/cell:bg-[#c56473]/60" />}
                                      </button>
                                    </td>
                                  );
                                })}
                                <td className="px-3 py-1.5 text-center">
                                  <div className="flex items-baseline justify-center gap-0.5">
                                    <span className={cn(
                                      "num-display text-[15px] font-semibold tabular-nums",
                                      pct >= 85 ? "text-[#3d7a5e]" : pct >= 60 ? "text-primary-d" : "text-[#a64953]",
                                    )}>
                                      {score?.correctWeight ?? 0}
                                    </span>
                                    <span className="text-[11px] tabular-nums text-muted">/{score?.totalWeight ?? 0}</span>
                                  </div>
                                  <div className="mx-auto mt-0.5 flex w-14 items-center gap-1">
                                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-3/60">
                                      <div
                                        className="h-full rounded-full transition-[width] duration-[var(--dur-slow)] ease-[var(--ease-quick)]"
                                        style={{ width: `${pct}%`, backgroundImage: barGrad, boxShadow: "0 0 5px rgba(197,100,115,0.25)" }}
                                      />
                                    </div>
                                    <span className="text-[10px] tabular-nums text-muted">{score?.scorePct != null ? `${Math.round(score.scorePct)}%` : "—"}</span>
                                  </div>
                                  {statusBadge && (
                                    <span className={cn("mt-0.5 inline-flex rounded-full px-1.5 py-[1px] text-[10px] font-medium ring-1 ring-inset", statusBadge.cls)}>
                                      {statusBadge.text}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-1.5">
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="flex justify-center gap-1">
                                      <button onClick={() => fillStudent(st.id, true)}
                                        className="rounded-md bg-white/70 px-1.5 py-0.5 text-[10px] text-muted ring-1 ring-inset ring-line transition-all duration-[var(--dur-quick)] hover:-translate-y-[1px] hover:bg-[#e4f0e8] hover:text-[#3d7a5e] hover:shadow-[var(--shadow-xs)]">全对</button>
                                      <button onClick={() => fillStudent(st.id, null)}
                                        className="rounded-md bg-white/70 px-1.5 py-0.5 text-[10px] text-muted ring-1 ring-inset ring-line transition-all duration-[var(--dur-quick)] hover:-translate-y-[1px] hover:bg-[#f7dfe0] hover:text-[#a64953] hover:shadow-[var(--shadow-xs)]">清空</button>
                                    </div>
                                    <input
                                      ref={(el) => { wrongInputRefs.current[st.id] = el; }}
                                      placeholder="错词序号"
                                      title="输入错词序号（如 3 5 7）回车：命中标错、其余标对，并跳到下一学生"
                                      className="h-7 w-24 rounded-md border border-line bg-panel px-2 text-xs tabular-nums placeholder:text-[10px] focus:border-[#c56473]/40 focus:outline-none"
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          const input = e.target as HTMLInputElement;
                                          const val = input.value;
                                          if (val.trim()) applyWrongIndices(st.id, val);
                                          input.value = "";
                                          const next = filteredStudents[rowIdx + 1];
                                          if (next) wrongInputRefs.current[next.id]?.focus();
                                        }
                                      }}
                                    />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>}
                </CardContent>
              </Card>
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

      <Dialog open={listDialog} onClose={() => setListDialog(false)} title={editingListId ? "编辑听写词表" : "新建听写词表"}>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>名称 *</Label><Input value={listForm.name} onChange={(e) => setListForm({ ...listForm, name: e.target.value })} placeholder="如 Unit 1 听写" /></div>
          <div className="space-y-1.5"><Label>班级</Label>
            <select value={listForm.classId} onChange={(e) => setListForm({ ...listForm, classId: e.target.value })} className="flex h-9 w-full rounded-md border border-line bg-panel px-3 text-sm">
              <option value="">无</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label>听写日期</Label><Input type="date" value={listForm.dictationDate} onChange={(e) => setListForm({ ...listForm, dictationDate: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label>过不过规则</Label>
            <div className="flex gap-2">
              <select
                value={listForm.passType}
                onChange={(e) => setListForm({ ...listForm, passType: e.target.value as PassType })}
                className="flex h-9 flex-1 rounded-md border border-line bg-panel px-3 text-sm"
              >
                <option value="none">不评定</option>
                <option value="wrong">错词上限</option>
                <option value="score">分数下限</option>
              </select>
              {listForm.passType !== "none" && (
                <Input
                  type="number"
                  min={0}
                  value={listForm.passValue}
                  onChange={(e) => setListForm({ ...listForm, passValue: e.target.value })}
                  placeholder={listForm.passType === "wrong" ? "允许错的个数" : "及格线（0-100）"}
                  className="h-9 w-36"
                />
              )}
            </div>
            <p className="text-[11px] text-muted">
              {listForm.passType === "wrong" ? "错词数 ≤ 阈值 → 及格" : listForm.passType === "score" ? "得分率 ≥ 阈值 → 及格" : "不判定及格/不及格"}
            </p>
          </div>
          <Button onClick={submitListForm} disabled={createListMut.isPending || editListMut.isPending} className="w-full">
            {editingListId ? "保存" : "创建"}
          </Button>
        </div>
      </Dialog>

      <Dialog open={wordDialog} onClose={() => setWordDialog(false)} title={editingWordId ? "编辑单词" : "添加单词"}>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>单词 *</Label><Input value={wordForm.word} onChange={(e) => setWordForm({ ...wordForm, word: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>释义</Label><Input value={wordForm.meaning} onChange={(e) => setWordForm({ ...wordForm, meaning: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>分值权重</Label>
            <Input
              type="number"
              min={0}
              value={wordForm.scoreWeight}
              onChange={(e) => setWordForm({ ...wordForm, scoreWeight: e.target.value })}
              className="h-9 w-24"
            />
            <p className="text-[11px] text-muted">加权得分时该词贡献的分数，默认 1。</p>
          </div>
          <Button onClick={submitWordForm} disabled={createWordMut.isPending || updateWordMut.isPending} className="w-full">
            {editingWordId ? "保存" : "添加"}
          </Button>
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
