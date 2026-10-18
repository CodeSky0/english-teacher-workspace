"use client";

import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { apiClient } from "@/lib/api-client";
import { useCurrentClass } from "@/hooks/use-classes";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { Plus, GraduationCap, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";
import { ScoreDistribution } from "./score-distribution";

type Exam = { id: string; name: string; classId: string; examDate: string | null; type: string | null; remark: string | null };
type Score = { id: string; examId: string; studentId: string; listeningScore: string | null; speakingScore: string | null; writtenScore: string | null; totalScore: string | null; totalIsManual: boolean };
type Student = { id: string; name: string; studentNo: string | null };

function calcTotal(s: Pick<Score, "listeningScore" | "speakingScore" | "writtenScore" | "totalScore" | "totalIsManual">): string | null {
  if (s.totalIsManual && s.totalScore) return s.totalScore;
  const l = s.listeningScore ? Number(s.listeningScore) : null;
  const sp = s.speakingScore ? Number(s.speakingScore) : null;
  const w = s.writtenScore ? Number(s.writtenScore) : null;
  if (l != null && sp != null && w != null) return String(l + sp + w);
  return s.totalScore ?? null;
}

export default function GradesPage() {
  const { currentClass, isLoading: classLoading } = useCurrentClass();
  const qc = useQueryClient();
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [examDialog, setExamDialog] = useState(false);
  const [examForm, setExamForm] = useState({ name: "", examDate: "", type: "", remark: "" });

  const { data: examsData, isLoading: examsLoading } = useQuery({
    queryKey: ["exams", currentClass?.id],
    queryFn: () => apiClient.get<{ data: Exam[] }>(`/exams${currentClass ? `?classId=${currentClass.id}` : ""}`),
    enabled: !!currentClass,
  });
  const exams = examsData?.data ?? [];

  const { data: studentsData } = useQuery({
    queryKey: ["students", currentClass?.id],
    queryFn: () => apiClient.get<{ data: Student[] }>(`/students?classId=${currentClass?.id}`),
    enabled: !!currentClass && !!selectedExam,
  });
  const students = studentsData?.data ?? [];

  const { data: scoresData } = useQuery({
    queryKey: ["scores", selectedExam?.id],
    queryFn: () => apiClient.get<{ data: Score[] }>(`/exams/${selectedExam?.id}/scores`),
    enabled: !!selectedExam,
  });
  const scores = useMemo(() => scoresData?.data ?? [], [scoresData]);
  const scoreMap = new Map(scores.map((s) => [s.studentId, s]));

  const gradesScrollRef = useRef<HTMLDivElement>(null);
  const gradesRowVirtualizer = useVirtualizer({
    count: students.length,
    getScrollElement: () => gradesScrollRef.current,
    estimateSize: () => 48,
    overscan: 8,
  });

  const createExamMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => apiClient.post("/exams", { ...d, classId: currentClass?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["exams"] }); toast.success("考试创建成功"); setExamDialog(false); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });

  const saveScoreMut = useMutation({
    mutationFn: async (params: { studentId: string; listening?: string; speaking?: string; written?: string }) => {
      const existing = scoreMap.get(params.studentId);
      if (existing) {
        return apiClient.patch(`/exams/scores/${existing.id}`, {
          listeningScore: params.listening ?? null, speakingScore: params.speaking ?? null, writtenScore: params.written ?? null,
        });
      }
      return apiClient.post(`/exams/${selectedExam?.id}/scores`, {
        studentId: params.studentId,
        listeningScore: params.listening ?? null, speakingScore: params.speaking ?? null, writtenScore: params.written ?? null,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scores"] }),
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });

  const totals = useMemo(
    () => scores.map((s) => calcTotal(s)).filter((t): t is string => t != null).map(Number).filter((n) => Number.isFinite(n)),
    [scores],
  );

  const stats = useMemo(() => {
    if (totals.length === 0) return null;
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
    return { avg: avg.toFixed(1), max: Math.max(...totals), min: Math.min(...totals), count: totals.length };
  }, [totals]);

  function handleScoreChange(studentId: string, field: "listening" | "speaking" | "written", value: string) {
    const existing = scoreMap.get(studentId);
    const l = field === "listening" ? value : (existing?.listeningScore ?? "");
    const sp = field === "speaking" ? value : (existing?.speakingScore ?? "");
    const w = field === "written" ? value : (existing?.writtenScore ?? "");
    saveScoreMut.mutate({ studentId, listening: l, speaking: sp, written: w });
  }

  if (classLoading) return <LoadingState />;
  if (!currentClass) return <div><PageHeader title="学情分析" /><Card><CardContent className="py-12"><EmptyState icon={<GraduationCap className="h-10 w-10" />} title="请先选择班级" /></CardContent></Card></div>;

  return (
    <div>
      <PageHeader title="学情分析" description={`${currentClass.name} · 共 ${exams.length} 场考试`}
        action={<Button onClick={() => setExamDialog(true)} className="gap-1.5"><Plus className="h-4 w-4" />创建考试</Button>} />

      {!selectedExam ? (
        <Card><CardContent className="p-0">
          {examsLoading ? <LoadingState /> : exams.length === 0 ? <EmptyState icon={<GraduationCap className="h-10 w-10" />} title="暂无考试" description="点击右上角创建考试" /> :
            <div className="divide-y divide-line">
              {exams.map((e) => (
                <button key={e.id} onClick={() => setSelectedExam(e)}
                  className="group flex w-full items-center gap-3.5 p-4 pl-5 text-left transition-[background] duration-[var(--dur-quick)] hover:bg-gradient-to-r hover:from-[#f8e4e7]/55 hover:via-[#f8e4e7]/12 hover:to-transparent">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.5rem] bg-gradient-to-b from-[#e9f0f6] to-[#dee8f0] text-[#3d6896] ring-1 ring-inset ring-[#3d6896]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                    <GraduationCap className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium tracking-[0.01em]">{e.name}</span>
                    <span className="mt-0.5 block text-xs text-muted">{e.examDate || "未定日期"}{e.type ? ` · ${e.type}` : ""}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform duration-[var(--dur-quick)] group-hover:translate-x-0.5 group-hover:text-primary" />
                </button>
              ))}
            </div>}
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <button onClick={() => setSelectedExam(null)}
                className="group inline-flex items-center gap-1 rounded-full bg-panel px-2.5 py-1 text-xs text-neutral-6 ring-1 ring-inset ring-line shadow-[var(--shadow-xs)] transition-all duration-[var(--dur-quick)] hover:-translate-x-[1px] hover:text-primary-d hover:shadow-[var(--shadow-sm)]">
                <ChevronRight className="h-3.5 w-3.5 rotate-180 transition-transform duration-[var(--dur-quick)] group-hover:-translate-x-0.5" />
                返回考试列表
              </button>
              <h3 className="font-serif text-[17px] tracking-[0.01em]">{selectedExam.name}</h3>
              {selectedExam.examDate && <span className="rounded bg-neutral-2 px-2 py-[1px] text-[11px] tabular-nums text-muted">{selectedExam.examDate}</span>}
            </div>
          </div>
          {stats && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "参评人数", value: stats.count, tone: "#5c5a55", bg: "#e3e1db" },
                { label: "平均分", value: stats.avg, tone: "#c56473", bg: "#f5dde0" },
                { label: "最高分", value: stats.max, tone: "#3d7a5e", bg: "#dcebe2" },
                { label: "最低分", value: stats.min, tone: "#a64953", bg: "#f3dadb" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="relative overflow-hidden rounded-xl border border-line/60 bg-gradient-to-b from-white to-[#fcfbf9] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                >
                  <div
                    className="absolute -right-5 -top-5 h-16 w-16 rounded-full opacity-[0.16] blur-2xl"
                    style={{ backgroundColor: s.tone }}
                  />
                  <div className="relative flex items-center gap-2.5">
                    <span
                      className="h-8 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: s.tone, opacity: 0.75 }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-muted">{s.label}</p>
                      <p className="font-serif text-xl font-semibold tabular-nums" style={{ color: s.tone }}>
                        {s.value}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {totals.length > 0 && <ScoreDistribution totals={totals} />}
          <Card><CardContent className="p-0">
            {students.length === 0 ? <EmptyState title="暂无学生" /> :
              <div ref={gradesScrollRef} className="overflow-auto max-h-[70vh]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10"><tr className="table-head border-b border-line text-left text-xs text-muted backdrop-blur-sm">
                    <th className="px-4 py-3 font-medium">姓名</th>
                    <th className="px-4 py-3 font-medium">听力</th>
                    <th className="px-4 py-3 font-medium">口语</th>
                    <th className="px-4 py-3 font-medium">笔试</th>
                    <th className="px-4 py-3 font-medium">总分</th>
                  </tr></thead>
                  <tbody>
                    {(() => {
                      const items = gradesRowVirtualizer.getVirtualItems();
                      if (items.length === 0) return null;
                      const padTop = items[0].start;
                      const padBottom = gradesRowVirtualizer.getTotalSize() - items[items.length - 1].end;
                      return (
                        <>
                          {padTop > 0 && <tr style={{ height: padTop }}><td colSpan={5} /></tr>}
                          {items.map((vr) => {
                            const st = students[vr.index];
                            const sc = scoreMap.get(st.id);
                            const total = sc ? calcTotal(sc) : null;
                            return (
                              <tr key={st.id} className="border-b border-line/50 transition-colors duration-[var(--dur-quick)] hover:bg-gradient-to-r hover:from-[#f8e4e7]/50 hover:to-transparent" style={{ height: vr.size }}>
                                <td className="px-4 py-2 font-medium">{st.name}</td>
                                <td className="px-4 py-2"><Input className="h-8 w-20" type="number" defaultValue={sc?.listeningScore ?? ""} onBlur={(e) => handleScoreChange(st.id, "listening", e.target.value)} placeholder="—" /></td>
                                <td className="px-4 py-2"><Input className="h-8 w-20" type="number" defaultValue={sc?.speakingScore ?? ""} onBlur={(e) => handleScoreChange(st.id, "speaking", e.target.value)} placeholder="—" /></td>
                                <td className="px-4 py-2"><Input className="h-8 w-20" type="number" defaultValue={sc?.writtenScore ?? ""} onBlur={(e) => handleScoreChange(st.id, "written", e.target.value)} placeholder="—" /></td>
                                <td className="px-4 py-2 font-semibold tabular-nums text-primary-d">{total ?? "—"}</td>
                              </tr>
                            );
                          })}
                          {padBottom > 0 && <tr style={{ height: padBottom }}><td colSpan={5} /></tr>}
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>}
          </CardContent></Card>
        </div>
      )}

      <Dialog open={examDialog} onClose={() => setExamDialog(false)} title="创建考试">
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>考试名称 *</Label><Input value={examForm.name} onChange={(e) => setExamForm({ ...examForm, name: e.target.value })} placeholder="如期中考试" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>考试日期</Label><Input type="date" value={examForm.examDate} onChange={(e) => setExamForm({ ...examForm, examDate: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>类型</Label><Input value={examForm.type} onChange={(e) => setExamForm({ ...examForm, type: e.target.value })} placeholder="如 阶段测试" /></div>
          </div>
          <div className="space-y-1.5"><Label>备注</Label><Input value={examForm.remark} onChange={(e) => setExamForm({ ...examForm, remark: e.target.value })} /></div>
          <Button onClick={async () => { if (!examForm.name.trim()) { toast.error("名称不能为空"); return; } await createExamMut.mutateAsync({ ...examForm, examDate: examForm.examDate || null }); }} disabled={createExamMut.isPending} className="w-full">{createExamMut.isPending ? "创建中…" : "创建"}</Button>
        </div>
      </Dialog>
    </div>
  );
}
