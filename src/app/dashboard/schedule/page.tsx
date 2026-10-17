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
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { subjectStyle } from "@/lib/subject-style";
import { getErrorMessage } from "@/lib/error";

type Cell = { id: string; dayOfWeek: number; periodNo: number; subject: string | null; classroom: string | null };

const DAYS = ["周一", "周二", "周三", "周四", "周五"];
const PERIODS = 8;

export default function SchedulePage() {
  const { currentClass, isLoading: classLoading } = useCurrentClass();
  const qc = useQueryClient();
  const [editCell, setEditCell] = useState<{ cell: Cell | null; day: number; period: number } | null>(null);
  const [subject, setSubject] = useState("");
  const [classroom, setClassroom] = useState("");

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

  if (classLoading) return <LoadingState />;
  if (!currentClass) return <div><PageHeader title="教学课表" /><Card><CardContent className="py-12"><EmptyState icon={<CalendarDays className="h-10 w-10" />} title="请先选择班级" /></CardContent></Card></div>;

  return (
    <div>
      <PageHeader title="教学课表" description={`${currentClass.name} · 点击单元格编辑`} />
      <Card>
        <CardContent className="p-2 overflow-x-auto">
          {isLoading ? <LoadingState /> : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="w-16 border border-line bg-bg p-2 text-xs font-medium text-muted">节次</th>
                  {DAYS.map((d) => <th key={d} className="border border-line bg-bg p-2 text-sm font-medium">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: PERIODS }, (_, i) => i + 1).map((period) => (
                  <tr key={period}>
                    <td className="border border-line bg-bg p-2 text-center text-xs font-medium text-muted">{period}</td>
                    {DAYS.map((_, dayIdx) => {
                      const day = dayIdx + 1;
                      const cell = cellMap.get(`${day}-${period}`);
                      const style = cell?.subject ? subjectStyle(cell.subject) : null;
                      return (
                        <td
                          key={day}
                          onClick={() => openEdit(day, period)}
                          className="cursor-pointer border border-line p-2 align-top transition-colors hover:bg-bg/50"
                          style={style ? { background: style.bg } : undefined}
                        >
                          {cell?.subject && (
                            <div style={{ color: style!.color }}>
                              <p className="text-sm font-medium">{cell.subject}</p>
                              {cell.classroom && <p className="text-xs opacity-70">{cell.classroom}</p>}
                            </div>
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
