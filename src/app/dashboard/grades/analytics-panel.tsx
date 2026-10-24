"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Sparkles, Radar as RadarIcon, TrendingUp, BarChart3, MessageSquare, FileDown } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";
import { generateStudentReport } from "@/lib/report";

type ClassProfile = {
  className: string; studentCount: number; examCount: number;
  dimensions: { listening: number; speaking: number; writing: number; total: number };
  scoreCount: number;
};
type TrendItem = {
  examId: string; examName: string; examDate: string | null;
  listening: number; speaking: number; writing: number; total: number;
};
type CompareItem = {
  classId: string; className: string;
  listening: number; speaking: number; writing: number; total: number; studentCount: number;
};

const DIM_LABELS: Record<string, string> = { listening: "听力", speaking: "口语", writing: "写作", total: "总分" };

export function AnalyticsPanel({ classId }: { classId: string }) {
  const [remarkOpen, setRemarkOpen] = useState(false);
  const [remarkResult, setRemarkResult] = useState<string>("");

  const { data: profileData } = useQuery({
    queryKey: ["analytics-profile", classId],
    queryFn: () => apiClient.get<{ data: ClassProfile }>(`/analytics/class/${classId}/profile`),
  });
  const { data: trendData } = useQuery({
    queryKey: ["analytics-trend", classId],
    queryFn: () => apiClient.get<{ data: TrendItem[] }>(`/analytics/class/${classId}/trend`),
  });
  const { data: compareData } = useQuery({
    queryKey: ["analytics-compare"],
    queryFn: () => apiClient.get<{ data: CompareItem[] }>(`/analytics/compare`),
  });

  const profile = profileData?.data;
  const trend = trendData?.data ?? [];
  const compare = compareData?.data ?? [];

  const radarData = profile
    ? [
        { dim: "听力", value: profile.dimensions.listening, full: 100 },
        { dim: "口语", value: profile.dimensions.speaking, full: 100 },
        { dim: "写作", value: profile.dimensions.writing, full: 100 },
        { dim: "总分", value: profile.dimensions.total, full: 150 },
      ]
    : [];

  const remarkMut = useMutation({
    mutationFn: (studentId: string) => apiClient.post<{ data: { content: string; isTemplate: boolean; note?: string } }>("/ai/remark", { studentId, classId }),
    onSuccess: (res) => { setRemarkResult(res.data.content); toast.success(res.data.note || "评语已生成"); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="icon-slot"><RadarIcon /></span>
            班级画像
            {profile && <span className="ml-auto text-xs font-normal text-muted">{profile.className} · {profile.studentCount} 人 · {profile.examCount} 次考试</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {radarData.length > 0 && radarData.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--line)" />
                <PolarAngleAxis dataKey="dim" tick={{ fill: "var(--muted)", fontSize: 13 }} />
                <PolarRadiusAxis angle={90} domain={[0, "auto"]} tick={{ fill: "var(--muted)", fontSize: 11 }} />
                <Radar name="均分" dataKey="value" stroke="#c56473" fill="#c56473" fillOpacity={0.35} strokeWidth={2} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--line)", fontSize: 13 }} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-muted">暂无成绩数据</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="icon-slot"><TrendingUp /></span>
            成绩趋势
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="examName" tick={{ fill: "var(--muted)", fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--line)", fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="listening" name="听力" stroke="#3d6896" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="speaking" name="口语" stroke="#5e9f7e" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="writing" name="写作" stroke="#c56473" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="total" name="总分" stroke="#a87a3d" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-muted">暂无趋势数据</p>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="icon-slot"><BarChart3 /></span>
            班级横向对比
          </CardTitle>
        </CardHeader>
        <CardContent>
          {compare.length > 1 && compare.some((c) => c.total > 0) ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={compare} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="className" tick={{ fill: "var(--muted)", fontSize: 12 }} />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--line)", fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="listening" name="听力" fill="#3d6896" radius={[3, 3, 0, 0]} />
                <Bar dataKey="speaking" name="口语" fill="#5e9f7e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="writing" name="写作" fill="#c56473" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-muted">至少需要两个班级的成绩数据才能对比</p>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="icon-slot"><MessageSquare /></span>
            AI 学情评语
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted">基于学生的考试成绩与听写数据，AI 自动生成个性化评语。</p>
          <Button variant="secondary" className="gap-1.5" onClick={() => setRemarkOpen(true)}>
            <Sparkles className="h-4 w-4" />选择学生生成评语
          </Button>
        </CardContent>
      </Card>

      <RemarkDialog
        open={remarkOpen}
        onClose={() => setRemarkOpen(false)}
        classId={classId}
        remarkMut={remarkMut}
        remarkResult={remarkResult}
        setRemarkResult={setRemarkResult}
      />
    </div>
  );
}

function RemarkDialog({
  open, onClose, classId, remarkMut, remarkResult, setRemarkResult,
}: {
  open: boolean; onClose: () => void; classId: string;
  remarkMut: { mutate: (vars: string) => void; isPending: boolean };
  remarkResult: string; setRemarkResult: (v: string) => void;
}) {
  const { data: studentsData } = useQuery({
    queryKey: ["students", classId],
    queryFn: () => apiClient.get<{ data: { id: string; name: string }[] }>(`/students?classId=${classId}`),
    enabled: open,
  });
  const students = studentsData?.data ?? [];
  const [selected, setSelected] = useState("");

  async function handleExportReport() {
    if (!selected) { toast.error("请先选择学生"); return; }
    try {
      const [profileRes, scoresRes] = await Promise.all([
        apiClient.get<{ data: { studentName: string; dimensions: { listening: number; speaking: number; writing: number; total: number }; dictationRate: number; examCount: number } }>(`/analytics/student/${selected}/profile`),
        apiClient.get<{ data: { examId: string; examName: string; examDate: string | null; listeningScore: string | null; speakingScore: string | null; writtenScore: string | null; totalScore: string | null }[] }>(`/analytics/student/${selected}/scores`).catch(() => ({ data: [] as { examId: string; examName: string; examDate: string | null; listeningScore: string | null; speakingScore: string | null; writtenScore: string | null; totalScore: string | null }[] })),
      ]);
      generateStudentReport({
        studentName: profileRes.data.studentName,
        className: "",
        examCount: profileRes.data.examCount,
        dimensions: profileRes.data.dimensions,
        dictationRate: profileRes.data.dictationRate,
        exams: scoresRes.data.map((s) => ({
          name: s.examName,
          examDate: s.examDate,
          listening: s.listeningScore ? Number(s.listeningScore) : null,
          speaking: s.speakingScore ? Number(s.speakingScore) : null,
          writing: s.writtenScore ? Number(s.writtenScore) : null,
          total: s.totalScore ? Number(s.totalScore) : null,
        })),
        remark: remarkResult || undefined,
      });
      toast.success("PDF 报告已生成");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "导出失败"));
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="AI 学情评语" className="max-w-2xl">
      <div className="space-y-3">
        <div className="flex gap-2">
          <select value={selected} onChange={(e) => setSelected(e.target.value)} className="flex h-9 flex-1 rounded-md border border-line bg-panel px-3 text-sm">
            <option value="">选择学生…</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Button className="gap-1.5" disabled={!selected || remarkMut.isPending}
            onClick={() => { setRemarkResult(""); remarkMut.mutate(selected); }}>
            <Sparkles className="h-4 w-4" />{remarkMut.isPending ? "生成中…" : "生成评语"}
          </Button>
          <Button variant="outline" className="gap-1.5" disabled={!selected}
            onClick={handleExportReport}>
            <FileDown className="h-4 w-4" />导出 PDF
          </Button>
        </div>
        {remarkResult && (
          <div className="rounded-lg bg-neutral-1/60 p-4 text-sm leading-relaxed whitespace-pre-wrap">{remarkResult}</div>
        )}
      </div>
    </Dialog>
  );
}
