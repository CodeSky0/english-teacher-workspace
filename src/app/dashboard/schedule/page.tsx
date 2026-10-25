"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCurrentClass } from "@/hooks/use-classes";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { LoadingState, EmptyState } from "@/components/ui/states";
import { BreakdownBars } from "@/components/common/breakdown";
import { GlassToolbar } from "@/components/common/toolbar";
import { SectionHeader } from "@/components/common/section-header";
import { StatBar } from "@/components/common/stat-bar";
import { CalendarDays, Layers, CalendarRange, MoveRight } from "lucide-react";
import { toast } from "sonner";
import { subjectStyle } from "@/lib/subject-style";
import { getErrorMessage } from "@/lib/error";

type Cell = { id: string; dayOfWeek: number; periodNo: number; subject: string | null; classroom: string | null };

const DAYS = ["周一", "周二", "周三", "周四", "周五"];
const DAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri"];
/** 节次时间：仅展示用（与默认作息一致），完整区间放在 title 提示里 */
const PERIOD_TIMES = [
  ["08:00", "08:45"], ["08:55", "09:40"], ["10:00", "10:45"], ["10:55", "11:40"],
  ["14:00", "14:45"], ["14:55", "15:40"], ["16:00", "16:45"], ["16:55", "17:40"],
] as const;
const PERIODS = 8;

/** subjectStyle 返回的是 CSS 变量，分布条需要可拼 alpha 的 hex，这里做一次映射 */
const VAR_HEX: Record<string, string> = {
  "var(--c-listen)": "#3d6896",
  "var(--c-grammar)": "#a87a3d",
  "var(--c-read)": "#5e9f7e",
  "var(--c-write)": "#c56473",
  "var(--c-vocab)": "#5c5a55",
  "var(--c-speak)": "#3d6896",
  "var(--c-exam)": "#a64953",
  "var(--c-homework)": "#7c3aed",
  "var(--c-other)": "#a8a69f",
};
function subjectHex(name: string): string {
  return VAR_HEX[subjectStyle(name).color] ?? "#a8a69f";
}

export default function SchedulePage() {
  const { currentClass, isLoading: classLoading } = useCurrentClass();
  const qc = useQueryClient();
  const [editCell, setEditCell] = useState<{ cell: Cell | null; day: number; period: number } | null>(null);
  const [subject, setSubject] = useState("");
  const [classroom, setClassroom] = useState("");
  /** 挂载标记：SSR 与首次水合都先渲染骨架，避免 provider 数据差异导致水合不匹配 */
  const [mounted, setMounted] = useState(false);
  /** 今日列高亮（挂载后再算，避免 SSR 水合不一致） */
  const [today, setToday] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setMounted(true);
      const d = new Date().getDay();
      setToday(d >= 1 && d <= 5 ? d : 0);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["schedule", currentClass?.id],
    queryFn: () => apiClient.get<{ data: Cell[] }>(`/schedule/cells?classId=${currentClass?.id}`),
    enabled: !!currentClass,
  });

  const cells = data?.data ?? [];
  const cellMap = new Map(cells.map((c) => [`${c.dayOfWeek}-${c.periodNo}`, c]));

  const upsertMut = useMutation({
    mutationFn: async (params: { day: number; period: number; subject: string; classroom: string }) => {
      const existing = cellMap.get(`${params.day}-${params.period}`);
      if (existing) {
        return apiClient.patch(`/schedule/cells/${existing.id}`, { subject: params.subject || null, classroom: params.classroom || null });
      }
      return apiClient.post("/schedule/cells", {
        classId: currentClass?.id, dayOfWeek: params.day, periodNo: params.period,
        subject: params.subject || null, classroom: params.classroom || null,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["schedule"] }); toast.success("已保存"); },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "保存失败")),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/schedule/cells/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["schedule"] }); toast.success("已清空"); },
  });

  function openEdit(day: number, period: number) {
    const cell = cellMap.get(`${day}-${period}`) ?? null;
    setEditCell({ cell, day, period });
    setSubject(cell?.subject ?? "");
    setClassroom(cell?.classroom ?? "");
  }

  async function handleSave() {
    if (!editCell) return;
    await upsertMut.mutateAsync({ day: editCell.day, period: editCell.period, subject, classroom });
    setEditCell(null);
  }

  async function handleClear() {
    if (!editCell?.cell) { setEditCell(null); return; }
    await deleteMut.mutateAsync(editCell.cell.id);
    setEditCell(null);
  }

  if (classLoading || !mounted) return <LoadingState />;
  if (!currentClass) {
    return (
      <div>
        <PageHeader title="教学课表" />
        <Card><CardContent>
          <EmptyState icon={<CalendarDays className="h-10 w-10" />} title="请先选择班级" description="在顶栏选择班级后即可编辑该班的周课表" />
        </CardContent></Card>
      </div>
    );
  }

  /* ── 纯展示派生：排课覆盖、学科分布、每日节数 ── */
  const totalSlots = DAYS.length * PERIODS;
  const filled = cells.filter((c) => c.subject).length;
  const coverage = Math.round((filled / totalSlots) * 100);

  const subjectCount = new Map<string, number>();
  for (const c of cells) {
    if (!c.subject) continue;
    subjectCount.set(c.subject, (subjectCount.get(c.subject) ?? 0) + 1);
  }
  const subjectList = [...subjectCount.entries()].sort((a, b) => b[1] - a[1]);
  const perDay = DAYS.map((_, i) => cells.filter((c) => c.dayOfWeek === i + 1 && c.subject).length);
  const peakDay = Math.max(1, ...perDay);

  return (
    <div>
      <PageHeader title="教学课表" description={`${currentClass.name} · 点击单元格编辑`} />

      {/* ══════════ 概览条 ══════════ */}
      {!isLoading && (
        <StatBar
          items={[
            { label: "已排课节", hint: "Scheduled", value: filled, suffix: "节" },
            { label: "空闲格", hint: "Free Slots", value: totalSlots - filled, suffix: "格" },
            { label: "学科覆盖", hint: "Subjects", value: subjectList.length, suffix: "门" },
            { label: "排课覆盖率", hint: "Coverage", value: coverage, suffix: "%" },
          ]}
          note={
            <span className="hidden items-center gap-1.5 text-[11px] text-neutral-6 sm:inline-flex">
              <MoveRight className="h-3.5 w-3.5" />
              点击单元格编辑课程
            </span>
          }
        />
      )}

      {/* ══════════ 玻璃工具条：学科图例 + 操作提示 ══════════ */}
      {!isLoading && (
        <GlassToolbar>
          <span className="eyebrow shrink-0">Subjects</span>
          <span className="hidden h-4 w-px bg-line sm:block" />
          <div className="flex flex-wrap items-center gap-1.5">
            {subjectList.map(([name, count]) => {
              const hex = subjectHex(name);
              return (
                <span key={name} className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2 py-0.5 text-[11px] text-neutral-7 ring-1 ring-inset ring-line/70">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: hex, boxShadow: `0 0 5px ${hex}66` }} />
                  {name}
                  <span className="tabular-nums text-muted">{count}</span>
                </span>
              );
            })}
          </div>
          {today > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#f8e4e7]/70 px-2 py-0.5 text-[11px] text-primary-d ring-1 ring-inset ring-primary/20">
              今天 · {DAYS[today - 1]}
            </span>
          )}
        </GlassToolbar>
      )}

      {/* ══════════ 周课表网格 ══════════ */}
      <Card className="mb-4">
        <SectionHeader icon={CalendarDays} title="周课表" en="Weekly Timetable" tone="hanada"
          right={<span className="tabular-nums">{filled} / {totalSlots} 格</span>} />
        <CardContent className="overflow-x-auto p-3">
          {isLoading ? <LoadingState /> : (
            <table className="w-full min-w-[560px] border-separate border-spacing-[3px]">
              <thead>
                <tr>
                  <th className="w-16 rounded-lg table-head p-2 text-center">
                    <span className="eyebrow block text-[9px]">Period</span>
                    <span className="mt-0.5 block text-[11px] font-medium text-neutral-6">节次</span>
                  </th>
                  {DAYS.map((d, i) => {
                    const isToday = today === i + 1;
                    return (
                      <th key={d}
                        className={
                          isToday
                            ? "rounded-lg bg-gradient-to-b from-[#f8e4e7] to-[#f2d6da] p-2 text-sm font-medium text-primary-d ring-1 ring-inset ring-[#c56473]/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
                            : "rounded-lg table-head p-2 text-sm font-medium"
                        }>
                        <span className="flex flex-col items-center gap-0.5">
                          <span className="eyebrow text-[9px] leading-none">{DAYS_EN[i]}</span>
                          <span className="flex items-center justify-center gap-1 leading-tight">
                            {d}
                            {isToday && <span className="h-1.5 w-1.5 rounded-full bg-[#c56473] shadow-[0_0_6px_rgba(197,100,115,0.7)]" />}
                          </span>
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: PERIODS }, (_, i) => i + 1).map((period) => (
                  <tr key={period}>
                    <td className="rounded-lg bg-neutral-2/45 p-2 text-center align-middle"
                      title={`第 ${period} 节 · ${PERIOD_TIMES[period - 1][0]}–${PERIOD_TIMES[period - 1][1]}`}>
                      <span className="num-display block text-[13px] font-semibold leading-none text-neutral-7">{period}</span>
                      <span className="mt-1 block text-[9px] leading-none tabular-nums text-neutral-6">{PERIOD_TIMES[period - 1][0]}</span>
                    </td>
                    {DAYS.map((_, dayIdx) => {
                      const day = dayIdx + 1;
                      const cell = cellMap.get(`${day}-${period}`);
                      const style = cell?.subject ? subjectStyle(cell.subject) : null;
                      return (
                        <td
                          key={day}
                          onClick={() => openEdit(day, period)}
                          title={cell?.subject ? cell.subject + (cell.classroom ? " · " + cell.classroom : "") : "点击添加课程"}
                          className={`group cursor-pointer rounded-lg border p-2 align-top transition-[transform,box-shadow,border-color] duration-[var(--dur-quick)] ease-[var(--ease-smooth)] hover:-translate-y-[1px] hover:border-primary/30 hover:shadow-paper-xs ${
                            today === day
                              ? "border-[#c56473]/30 shadow-[inset_0_0_0_1px_rgba(197,100,115,0.10)]"
                              : "border-line/40"
                          }`}
                          style={style ? { background: style.bg } : { background: today === day ? "rgba(248,228,231,0.35)" : undefined }}
                        >
                          {cell?.subject ? (
                            <div className="flex h-[38px] flex-col justify-center gap-0.5" style={{ color: style!.color }}>
                              <span className="flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: style!.color }} />
                                <span className="truncate text-sm font-medium leading-tight">{cell.subject}</span>
                              </span>
                              {cell.classroom && cell.classroom !== currentClass.name && (
                                <span className="truncate pl-3 text-[11px] leading-tight opacity-70">{cell.classroom}</span>
                              )}
                            </div>
                          ) : (
                            <span className="flex h-[38px] items-center justify-center text-sm text-neutral-5 opacity-0 transition-opacity duration-[var(--dur-quick)] group-hover:opacity-100">+</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* ══════════ 分布洞察 ══════════ */}
      {!isLoading && (
        <div className="reveal grid gap-3 md:grid-cols-2">
          <Card>
            <SectionHeader icon={Layers} title="学科分布" en="Subject Mix" tone="wakatake"
              right={<span className="tabular-nums">{subjectList.length} 门学科</span>} />
            <CardContent className="pt-4">
              {subjectList.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted">还没有排课，点击上方单元格开始安排</p>
              ) : (
                <BreakdownBars
                  items={subjectList.map(([name, count]) => ({ label: name, value: count, color: subjectHex(name) }))}
                  unit=" 节"
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <SectionHeader icon={CalendarRange} title="每日节数" en="Daily Load" tone="kuchiba"
              right={<span className="tabular-nums">本周 {filled} 节</span>} />
            <CardContent className="pt-4">
              <div className="flex h-32 items-end gap-2">
                {perDay.map((v, i) => (
                  <div key={DAYS[i]} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                    <span className="num-display text-[13px] font-semibold text-text">{v}</span>
                    <div className="relative flex w-full flex-1 items-end">
                      <div
                        className="bar-grow w-full rounded-t-[4px]"
                        style={{
                          height: Math.max(v > 0 ? 8 : 3, (v / peakDay) * 100) + "%",
                          backgroundImage: v > 0 ? "linear-gradient(180deg,#d98b98,#b8556a)" : "linear-gradient(180deg,#e8e6e0,#dedcd5)",
                          boxShadow: v > 0 ? "0 0 8px -2px rgba(197,100,115,0.55)" : "none",
                          animationDelay: i * 45 + "ms",
                        }}
                      />
                    </div>
                    <span className="text-[11px] text-muted">{DAYS[i]}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={!!editCell} onClose={() => setEditCell(null)} title={`编辑课程 (第${editCell?.period ?? ""}节 · ${DAYS[(editCell?.day ?? 1) - 1]})`}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">课程名称</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="如：英语阅读" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">教室</label>
            <Input value={classroom} onChange={(e) => setClassroom(e.target.value)} placeholder="如：3-201" />
          </div>
          <div className="flex justify-between">
            {editCell?.cell ? (
              <Button variant="destructive" onClick={handleClear} disabled={deleteMut.isPending}>清空</Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditCell(null)}>取消</Button>
              <Button onClick={handleSave} disabled={upsertMut.isPending}>{upsertMut.isPending ? "保存中…" : "保存"}</Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
