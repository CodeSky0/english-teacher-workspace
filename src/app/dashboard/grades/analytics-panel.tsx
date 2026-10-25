"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { GlassTooltip } from "@/components/charts/glass-tooltip";
import { Sparkles, Radar as RadarIcon, TrendingUp, BarChart3, MessageSquare, FileDown } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";

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

/** 图表系列色（和色）：听力縹蓝 / 口语若竹 / 写作梅 / 总分朽葉 */
const SERIES = [
  { key: "listening", name: "听力", color: "#3d6896", soft: "#8db4d6" },
  { key: "speaking", name: "口语", color: "#4a8f74", soft: "#9ccbb2" },
  { key: "writing", name: "写作", color: "#c56473", soft: "#e3a5ae" },
] as const;

/** 迷你图例：替代 Recharts 笨重的默认图例 */
function ChartLegend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((it) => (
        <span key={it.name} className="inline-flex items-center gap-1.5 text-[11px] text-neutral-6">
          <span
            className="h-1.5 w-3 rounded-full"
            style={{ backgroundColor: it.color, boxShadow: `0 0 6px ${it.color}55` }}
          />
          {it.name}
        </span>
      ))}
    </div>
  );
}

/** 卡片标题区：eyebrow 英文小标 + 图标槽 + 右侧元信息 */
function PanelHeader({
  eyebrow,
  title,
  icon: Icon,
  meta,
}: {
  eyebrow: string;
  title: string;
  icon: React.ElementType;
  meta?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="eyebrow text-neutral-6">{eyebrow}</p>
        <CardTitle className="mt-1.5 flex items-center gap-2 text-base">
          {title}
        </CardTitle>
        {meta && <div className="mt-1 text-[11px] text-muted">{meta}</div>}
      </div>
      <span className="icon-slot">
        <Icon />
      </span>
    </div>
  );
}

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
    queryFn: () => apiClient.get<{ data: CompareItem[] }>("/analytics/compare"),
  });

  const profile = profileData?.data;
  const trend = trendData?.data ?? [];
  const compare = compareData?.data ?? [];
  /** 总分数据可能为 null（示例数据的 total_score 为空）：不做任何前端兜底，直接隐藏总分系列 */
  const hasTotal = trend.some((t) => t.total > 0);
  const compareHasData = compare.some((c) => c.listening > 0 || c.speaking > 0 || c.writing > 0);

  /**
   * 维度达成率（0–100）。雷达图用百分比归一化，四个维度量纲一致，
   * 形状才能真正反映「强弱画像」而不是被总分 150 的轴压扁。
   * 总分维度为 null（示例数据 total_score 为空）时不画该轴，绝不前端伪造。
   */
  const totalDim: number | null = profile && profile.dimensions.total > 0 ? profile.dimensions.total : null;
  const pct = (value: number, full: number) => Math.round((value / full) * 1000) / 10;
  const radarData = profile
    ? [
        { dim: "听力", value: pct(profile.dimensions.listening, 100) },
        { dim: "口语", value: pct(profile.dimensions.speaking, 100) },
        { dim: "写作", value: pct(profile.dimensions.writing, 100) },
        ...(totalDim != null ? [{ dim: "总分", value: pct(totalDim, 150) }] : []),
      ]
    : [];

  /** 雷达下方的四条维度分：满分配置用于换算百分比 */
  const dimRows = profile
    ? [
        { label: DIM_LABELS.listening, value: profile.dimensions.listening, full: 100, from: "#8db4d6", to: "#3d6896" },
        { label: DIM_LABELS.speaking, value: profile.dimensions.speaking, full: 100, from: "#9ccbb2", to: "#4a8f74" },
        { label: DIM_LABELS.writing, value: profile.dimensions.writing, full: 100, from: "#e3a5ae", to: "#c56473" },
        { label: DIM_LABELS.total, value: totalDim as number | null, full: 150, from: "#d8bd8e", to: "#a87a3d" },
      ]
    : [];

  const remarkMut = useMutation({
    mutationFn: (studentId: string) => apiClient.post<{ data: { content: string; isTemplate: boolean; note?: string } }>("/ai/remark", { studentId, classId }),
    onSuccess: (res) => { setRemarkResult(res.data.content); toast.success(res.data.note || "评语已生成"); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* ── 班级画像：渐变雷达 + 维度分条 ── */}
      <Card>
        <CardHeader>
          <PanelHeader
            eyebrow="Class Portrait"
            title="班级画像"
            icon={RadarIcon}
            meta={profile ? `${profile.className} · ${profile.studentCount} 人 · ${profile.examCount} 次考试${totalDim == null ? " · 总分待录入" : ""}` : undefined}
          />
        </CardHeader>
        <CardContent>
          {radarData.length > 0 && radarData.some((d) => d.value > 0) ? (
            <>
              <div className="relative">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(197,100,115,0.09),transparent_62%)]" />
              <ResponsiveContainer width="100%" height={248}>
                <RadarChart data={radarData} margin={{ top: 6, right: 16, bottom: 0, left: 16 }}>
                  <defs>
                    <linearGradient id="radar-fill-aurora" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#e3a5ae" stopOpacity={0.55} />
                      <stop offset="52%" stopColor="#b98aa6" stopOpacity={0.42} />
                      <stop offset="100%" stopColor="#8db4d6" stopOpacity={0.5} />
                    </linearGradient>
                    <linearGradient id="radar-stroke-aurora" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#d1707f" />
                      <stop offset="100%" stopColor="#3d6896" />
                    </linearGradient>
                  </defs>
                  <PolarGrid stroke="rgba(120,118,112,0.20)" strokeDasharray="2 5" />
                  <PolarAngleAxis dataKey="dim" tick={{ fill: "var(--muted)", fontSize: 12 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="达成率"
                    dataKey="value"
                    stroke="url(#radar-stroke-aurora)"
                    strokeWidth={2.5}
                    fill="url(#radar-fill-aurora)"
                    fillOpacity={1}
                    dot={{ r: 3, fill: "#fff", stroke: "#c56473", strokeWidth: 1.6 }}
                    activeDot={{ r: 5, fill: "#fff", stroke: "#c56473", strokeWidth: 2 }}
                    isAnimationActive={false}
                    style={{ filter: "drop-shadow(0 4px 14px rgba(197,100,115,0.35))" }}
                  />
                  <Tooltip
                    content={<GlassTooltip suffix="%" decimals={1} />}
                    cursor={false}
                  />
                </RadarChart>
              </ResponsiveContainer>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-line/60 pt-3">
                {dimRows.map((d) => (
                  <div key={d.label}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] text-muted">{d.label}</span>
                      <span className="num-display text-[13px] font-semibold tabular-nums text-text">
                        {d.value == null ? "—" : Math.round(d.value * 10) / 10}
                        {d.value != null && (
                          <span className="ml-0.5 text-[10px] font-normal text-neutral-5">/{d.full}</span>
                        )}
                      </span>
                    </div>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-neutral-3/50">
                      <div
                        className="h-full rounded-full transition-[width] duration-[var(--dur-slow)] ease-[var(--ease-quick)]"
                        style={{
                          width: `${d.value == null ? 0 : Math.max(2, Math.min(100, (d.value / d.full) * 100))}%`,
                          backgroundImage: `linear-gradient(90deg, ${d.from}, ${d.to})`,
                          boxShadow: `0 0 8px ${d.to}44`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="py-12 text-center text-sm text-muted">暂无成绩数据</p>
          )}
        </CardContent>
      </Card>

      {/* ── 成绩趋势：渐变面积线 ── */}
      <Card>
        <CardHeader>
          <PanelHeader
            eyebrow="Score Trend"
            title="成绩趋势"
            icon={TrendingUp}
            meta={trend.length > 0 ? `最近 ${trend.length} 场考试 · 分项均分走势` : undefined}
          />
        </CardHeader>
        <CardContent>
          {trend.length > 0 ? (
            <>
              <ChartLegend
                items={[
                  ...SERIES.map((s) => ({ name: s.name, color: s.color })),
                  ...(hasTotal ? [{ name: "总分（右轴）", color: "#a87a3d" }] : []),
                ]}
              />
              <ResponsiveContainer width="100%" height={236}>
                <AreaChart data={trend} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                  <defs>
                    {SERIES.map((s) => (
                      <linearGradient key={s.key} id={`trend-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={s.color} stopOpacity={0.34} />
                        <stop offset="62%" stopColor={s.color} stopOpacity={0.10} />
                        <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="2 7" stroke="rgba(120,118,112,0.16)" />
                  <XAxis
                    dataKey="examName"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                    interval="preserveStartEnd"
                    height={34}
                    tickFormatter={(value: string) => (value.length > 8 ? value.slice(0, 8) + "…" : value)}
                  />
                  <YAxis
                    yAxisId="left"
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                    width={34}
                  />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 150]} hide />
                  {SERIES.map((s) => (
                    <Area
                      key={s.key}
                      yAxisId="left"
                      type="monotone"
                      dataKey={s.key}
                      name={s.name}
                      stroke={s.color}
                      strokeWidth={2.2}
                      fill={`url(#trend-${s.key})`}
                      dot={{ r: 2.6, fill: "#fff", stroke: s.color, strokeWidth: 1.4 }}
                      activeDot={{ r: 4.5, fill: "#fff", stroke: s.color, strokeWidth: 2 }}
                      isAnimationActive={false}
                      style={{ filter: `drop-shadow(0 2px 6px ${s.color}33)` }}
                    />
                  ))}
                  {hasTotal && (
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="total"
                    name="总分"
                    stroke="#a87a3d"
                    strokeWidth={1.8}
                    strokeDasharray="5 4"
                    fill="transparent"
                    dot={false}
                    activeDot={{ r: 4, fill: "#fff", stroke: "#a87a3d", strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                  )}
                  <Tooltip
                    content={<GlassTooltip suffix=" 分" decimals={1} />}
                    cursor={{ stroke: "rgba(197,100,115,0.28)", strokeWidth: 1, strokeDasharray: "3 3" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </>
          ) : (
            <p className="py-12 text-center text-sm text-muted">暂无趋势数据</p>
          )}
        </CardContent>
      </Card>

      {/* ── 班级横向对比：渐变圆角柱 ── */}
      <Card className="md:col-span-2">
        <CardHeader>
          <PanelHeader
            eyebrow="Class Comparison"
            title="班级横向对比"
            icon={BarChart3}
            meta={compare.length > 1 ? `${compare.length} 个班级 · 分项均分对比` : undefined}
          />
        </CardHeader>
        <CardContent>
          {compare.length > 1 && compareHasData ? (
            <>
              <ChartLegend items={SERIES.map((s) => ({ name: s.name, color: s.color }))} />
              <ResponsiveContainer width="100%" height={232}>
                <BarChart data={compare} barGap={4} barCategoryGap="22%" margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    {SERIES.map((s) => (
                      <linearGradient key={s.key} id={`bar-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={s.soft} />
                        <stop offset="48%" stopColor={s.color} />
                        <stop offset="100%" stopColor={s.color} stopOpacity={0.85} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="2 7" stroke="rgba(120,118,112,0.16)" />
                  <XAxis dataKey="className" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} width={34} />
                  <Tooltip
                    content={<GlassTooltip suffix=" 分" decimals={1} />}
                    cursor={{ fill: "rgba(197,100,115,0.06)" }}
                  />
                  {SERIES.map((s) => (
                    <Bar
                      key={s.key}
                      dataKey={s.key}
                      name={s.name}
                      fill={`url(#bar-${s.key})`}
                      radius={[6, 6, 2, 2]}
                      maxBarSize={26}
                      isAnimationActive={false}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : (
            <p className="py-12 text-center text-sm text-muted">至少需要两个班级的成绩数据才能对比</p>
          )}
        </CardContent>
      </Card>

      {/* ── AI 学情评语：釉面强调卡 ── */}
      <Card className="glaze md:col-span-2">
        <CardContent className="pt-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(160deg,#f8e4e7,#f0cfd4)] text-primary-d ring-1 ring-inset ring-primary/20">
                <span className="absolute inset-0 rounded-xl bg-primary/20 blur-lg animate-breathe" />
                <MessageSquare className="relative h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="eyebrow text-neutral-6">AI Remark</p>
                <p className="mt-1 font-medium">AI 学情评语</p>
                <p className="mt-1 max-w-xl text-xs text-muted">
                  基于学生的考试成绩与听写数据，AI 自动生成个性化评语，可导出 PDF 学情报告。
                </p>
              </div>
            </div>
            <Button variant="secondary" className="gap-1.5 shadow-glow" onClick={() => setRemarkOpen(true)}>
              <Sparkles className="h-4 w-4" />选择学生生成评语
            </Button>
          </div>
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
      const { generateStudentReport } = await import("@/lib/report");
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
          <div className="rounded-lg border border-line/60 bg-gradient-to-b from-white to-[#fcfbf9] p-4 text-sm leading-relaxed whitespace-pre-wrap shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">{remarkResult}</div>
        )}
      </div>
    </Dialog>
  );
}
