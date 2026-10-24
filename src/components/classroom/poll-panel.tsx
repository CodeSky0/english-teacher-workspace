"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Plus, Trash2, QrCode, Vote, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";
import { cn } from "@/lib/utils";

type Poll = { id: string; question: string; type: string; isActive: boolean; classId: string };
type PollOption = { id: string; label: string; voteCount: number };

export function PollPanel({ classId }: { classId: string }) {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState<Poll | null>(null);
  const [form, setForm] = useState({ question: "", options: ["", ""] });
  const [liveOptions, setLiveOptions] = useState<PollOption[]>([]);
  const [activePoll, setActivePoll] = useState<Poll | null>(null);

  const { data: pollsData } = useQuery({
    queryKey: ["polls", classId],
    queryFn: () => apiClient.get<{ data: Poll[] }>(`/classroom/polls?classId=${classId}`),
  });
  const polls = (pollsData?.data ?? []).filter((p) => p.classId === classId);

  const createPollMut = useMutation({
    mutationFn: async (d: { question: string; options: string[] }) => {
      const poll = await apiClient.post<{ data: Poll }>("/classroom/polls", { classId, question: d.question, type: "single_choice", isActive: true });
      for (const label of d.options.filter((o) => o.trim())) {
        await apiClient.post("/classroom/poll-options", { pollId: poll.data.id, label });
      }
      return poll;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["polls"] }); toast.success("投票已创建"); setCreateOpen(false); setForm({ question: "", options: ["", ""] }); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });

  const endPollMut = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/classroom/polls/${id}`, { isActive: false }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["polls"] }); toast.success("投票已结束"); setActivePoll(null); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });

  const deletePollMut = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/classroom/polls/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["polls"] }); toast.success("已删除"); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });

  const fetchLiveResults = useCallback(async () => {
    if (!activePoll) return;
    try {
      const res = await fetch(`/api/poll/${activePoll.id}`);
      if (res.ok) {
        const json = await res.json();
        setLiveOptions(json.data?.options ?? []);
      }
    } catch { /* ignore */ }
  }, [activePoll]);

  useEffect(() => {
    if (!activePoll) { setLiveOptions([]); return; }
    fetchLiveResults();
    const interval = setInterval(fetchLiveResults, 2000);
    return () => clearInterval(interval);
  }, [fetchLiveResults, activePoll]);

  const totalVotes = liveOptions.reduce((sum, o) => sum + o.voteCount, 0);

  function addOption() { setForm((f) => ({ ...f, options: [...f.options, ""] })); }
  function removeOption(i: number) { setForm((f) => ({ ...f, options: f.options.filter((_, idx) => idx !== i) })); }

  async function handleCreate() {
    if (!form.question.trim()) { toast.error("问题不能为空"); return; }
    if (form.options.filter((o) => o.trim()).length < 2) { toast.error("至少需要 2 个选项"); return; }
    await createPollMut.mutateAsync({ question: form.question, options: form.options });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="icon-slot"><Vote /></span>
          课堂投票
          <Button size="sm" className="ml-auto gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />发起投票
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {polls.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">暂无投票，点击右上角发起</p>
        ) : (
          <div className="space-y-2">
            {polls.map((poll) => (
              <div key={poll.id} className="group flex items-center gap-3 rounded-lg border border-line bg-panel p-3 transition-all duration-[var(--dur-quick)] hover:shadow-[var(--shadow-sm)]">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", poll.isActive ? "bg-gradient-to-b from-[#f8e4e7] to-[#f2d6da] text-primary-d" : "bg-neutral-2 text-muted")}>
                  <Vote className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{poll.question}</span>
                  <span className={cn("text-xs", poll.isActive ? "text-[#5e9f7e]" : "text-muted")}>{poll.isActive ? "进行中" : "已结束"}</span>
                </div>
                <div className="flex gap-1 opacity-55 transition-opacity group-hover:opacity-100">
                  {poll.isActive && (
                    <button onClick={() => { setActivePoll(poll); setQrOpen(poll); }} title="实时结果与二维码" className="rounded-md p-1.5 text-muted transition-colors hover:bg-panel hover:text-primary">
                      <QrCode className="h-4 w-4" />
                    </button>
                  )}
                  {poll.isActive && (
                    <button onClick={() => endPollMut.mutate(poll.id)} title="结束投票" className="rounded-md p-1.5 text-muted transition-colors hover:bg-[#f8e4e7] hover:text-[#a64953]">
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => deletePollMut.mutate(poll.id)} title="删除" className="rounded-md p-1.5 text-muted transition-colors hover:bg-[#f8e4e7] hover:text-[#a64953]">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activePoll && liveOptions.length > 0 && (
          <div className="mt-4 rounded-lg bg-neutral-1/60 p-4">
            <p className="mb-2 text-sm font-medium">{activePoll.question} · 实时结果</p>
            <div className="space-y-2">
              {liveOptions.map((opt, i) => {
                const pct = totalVotes > 0 ? (opt.voteCount / totalVotes) * 100 : 0;
                const colors = ["#c56473", "#3d6896", "#5e9f7e", "#a87a3d"];
                const color = colors[i % colors.length];
                return (
                  <div key={opt.id} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 truncate text-sm">{opt.label}</span>
                    <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-neutral-2">
                      <div className="absolute inset-y-0 left-0 transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }} />
                    </div>
                    <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums" style={{ color }}>{opt.voteCount} ({pct.toFixed(0)}%)</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted">共 {totalVotes} 票 · 每 2 秒自动刷新</p>
          </div>
        )}
      </CardContent>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="发起课堂投票">
        <div className="space-y-3">
          <div className="space-y-1"><Label>问题 *</Label><Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="如：这节课你掌握了多少？" /></div>
          <div className="space-y-1">
            <Label>选项（至少 2 个）</Label>
            {form.options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <Input value={opt} onChange={(e) => setForm((f) => ({ ...f, options: f.options.map((o, idx) => idx === i ? e.target.value : o) }))} placeholder={`选项 ${i + 1}`} />
                {form.options.length > 2 && <Button variant="ghost" size="icon" onClick={() => removeOption(i)}><X className="h-4 w-4" /></Button>}
              </div>
            ))}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={addOption}><Plus className="h-3.5 w-3.5" />添加选项</Button>
          </div>
          <Button onClick={handleCreate} disabled={createPollMut.isPending} className="w-full">创建投票</Button>
        </div>
      </Dialog>

      <Dialog open={!!qrOpen} onClose={() => { setQrOpen(null); setActivePoll(null); }} title="学生扫码投票" className="max-w-md">
        {qrOpen && (
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-md)]">
              <QRCodeSVG value={`${typeof window !== "undefined" ? window.location.origin : ""}/poll/${qrOpen.id}`} size={200} fgColor="#24231f" bgColor="#ffffff" level="M" />
            </div>
            <div className="text-center">
              <p className="font-medium">{qrOpen.question}</p>
              <p className="mt-1 text-sm text-muted">学生用手机扫码即可参与投票</p>
              <a href={`/poll/${qrOpen.id}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-primary hover:underline">{`/poll/${qrOpen.id}`}</a>
            </div>
          </div>
        )}
      </Dialog>
    </Card>
  );
}
