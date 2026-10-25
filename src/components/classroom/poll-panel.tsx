"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Plus, Trash2, QrCode, Vote, X, CheckCircle2, Radio, Smartphone, Trophy } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";
import { cn } from "@/lib/utils";

type Poll = { id: string; question: string; type: string; isActive: boolean; classId: string };
type PollOption = { id: string; label: string; voteCount: number };

/** 结果条色阶：梅 / 縹 / 若竹 / 朽葉 */
const BAR_TONES = [
  { bar: "linear-gradient(90deg, #e0a0ab, #c56473)", text: "#a64953" },
  { bar: "linear-gradient(90deg, #a9c5e2, #3d6896)", text: "#3d6896" },
  { bar: "linear-gradient(90deg, #a9d4bd, #4a8f74)", text: "#3d7a5e" },
  { bar: "linear-gradient(90deg, #e6cb9f, #a87a3d)", text: "#8a6230" },
];

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
  const leading = liveOptions.length
    ? [...liveOptions].sort((a, b) => b.voteCount - a.voteCount)[0]
    : null;

  function addOption() { setForm((f) => ({ ...f, options: [...f.options, ""] })); }
  function removeOption(i: number) { setForm((f) => ({ ...f, options: f.options.filter((_, idx) => idx !== i) })); }

  async function handleCreate() {
    if (!form.question.trim()) { toast.error("问题不能为空"); return; }
    if (form.options.filter((o) => o.trim()).length < 2) { toast.error("至少需要 2 个选项"); return; }
    await createPollMut.mutateAsync({ question: form.question, options: form.options });
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow flex items-center gap-2 text-[#b8556a]/75">
              <Radio className="h-3 w-3" />
              Live Poll
            </p>
            <CardTitle className="mt-1.5 flex items-center gap-2.5 text-[17px]">
              <span className="icon-slot"><Vote /></span>
              课堂投票
              {polls.some((p) => p.isActive) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#e4f0e8] px-2 py-0.5 text-[10px] font-medium text-[#3d7a5e] ring-1 ring-inset ring-[#5e9f7e]/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#5e9f7e] animate-breathe" />
                  进行中
                </span>
              )}
            </CardTitle>
          </div>
          <Button size="sm" className="shrink-0 gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />发起投票
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {polls.length === 0 ? (
          <div className="relative overflow-hidden rounded-xl border border-dashed border-line/80 bg-[linear-gradient(165deg,rgba(255,255,255,0.7),rgba(250,248,244,0.6))] px-4 py-9 text-center">
            <div className="pointer-events-none absolute inset-0 grid-veil opacity-40" />
            <div className="relative mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-b from-[#f8e4e7] to-[#f2d6da] text-[#a64953] ring-1 ring-inset ring-[#c56473]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <Vote className="h-5 w-5" />
            </div>
            <p className="relative text-sm font-medium text-text">还没有课堂投票</p>
            <p className="relative mt-1 text-xs text-muted">发起后学生扫码即可用手机作答，结果实时回传</p>
            <Button size="sm" variant="secondary" className="relative mt-3 gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" />发起第一个投票
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {polls.map((poll) => (
              <div
                key={poll.id}
                className={cn(
                  "group relative flex items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5",
                  "transition-all duration-[var(--dur-quick)] ease-[var(--ease-smooth)] hover:-translate-y-[1px] hover:shadow-paper-sm",
                  poll.isActive
                    ? "border-[#5e9f7e]/30 bg-[linear-gradient(100deg,rgba(228,240,232,0.7),rgba(255,255,255,0.55))]"
                    : "border-line/70 bg-[linear-gradient(160deg,rgba(255,255,255,0.75),rgba(250,249,246,0.6))]"
                )}
              >
                {/* 左侧状态竖条 */}
                <span
                  className={cn(
                    "absolute inset-y-2 left-0 w-[3px] rounded-full",
                    poll.isActive ? "bg-[linear-gradient(180deg,#7fbb9c,#4a8f74)] shadow-[0_0_8px_rgba(94,159,126,0.45)]" : "bg-line"
                  )}
                />
                <span
                  className={cn(
                    "ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] ring-1 ring-inset",
                    poll.isActive
                      ? "bg-gradient-to-b from-[#e4f0e8] to-[#d5e8dc] text-[#3d7a5e] ring-[#5e9f7e]/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
                      : "bg-gradient-to-b from-[#f2f1ed] to-[#eae8e2] text-neutral-6 ring-line/70"
                  )}
                >
                  <Vote className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{poll.question}</span>
                  <span className={cn("mt-0.5 inline-flex items-center gap-1 text-[11px]", poll.isActive ? "text-[#3d7a5e]" : "text-muted")}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", poll.isActive ? "bg-[#5e9f7e] animate-breathe" : "bg-neutral-4")} />
                    {poll.isActive ? "进行中 · 实时结果" : "已结束"}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-80 transition-opacity duration-[var(--dur-quick)] group-hover:opacity-100">
                  {poll.isActive && (
                    <button onClick={() => { setActivePoll(poll); setQrOpen(poll); }} title="实时结果与二维码" aria-label="实时结果与二维码" className="flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white hover:text-primary">
                      <QrCode className="h-4 w-4" />
                    </button>
                  )}
                  {poll.isActive && (
                    <button onClick={() => endPollMut.mutate(poll.id)} title="结束投票" aria-label="结束投票" className="flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-[#e4f0e8] hover:text-[#3d7a5e]">
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => deletePollMut.mutate(poll.id)} title="删除投票" aria-label="删除投票" className="flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-[#f8e4e7] hover:text-[#a64953]">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activePoll && liveOptions.length > 0 && (
          <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-[linear-gradient(165deg,rgba(255,255,255,0.72),rgba(248,246,242,0.55))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
            <div className="pointer-events-none absolute inset-0 grid-veil opacity-35" />
            <div className="relative mb-3 flex flex-wrap items-center gap-2">
              <span className="eyebrow flex items-center gap-1.5 text-[#b8556a]/80">
                <span className="h-1.5 w-1.5 rounded-full bg-[#b8556a] animate-breathe" />
                Live Results
              </span>
              <span className="h-3 w-px bg-line" />
              <span className="text-[13px] font-medium text-text">{activePoll.question}</span>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[11px] tabular-nums text-muted ring-1 ring-inset ring-white/90">
                共 <b className="font-semibold text-text">{totalVotes}</b> 票
              </span>
            </div>
            <div className="relative space-y-2.5">
              {liveOptions.map((opt, i) => {
                const pct = totalVotes > 0 ? (opt.voteCount / totalVotes) * 100 : 0;
                const tone = BAR_TONES[i % BAR_TONES.length];
                const isLead = leading?.id === opt.id && opt.voteCount > 0;
                return (
                  <div key={opt.id} className="group">
                    <div className="mb-1 flex items-center gap-2 text-[12px]">
                      <span className="w-20 shrink-0 truncate font-medium text-neutral-7">{opt.label}</span>
                      {isLead && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-[#f7ecda] px-1.5 py-[1px] text-[10px] text-[#8a6230] ring-1 ring-inset ring-[#a87a3d]/25">
                          <Trophy className="h-2.5 w-2.5" />领先
                        </span>
                      )}
                      <span className="ml-auto shrink-0 tabular-nums" style={{ color: tone.text }}>
                        <b className="num-display text-[15px] font-semibold">{opt.voteCount}</b>
                        <span className="ml-1 text-[10px] opacity-80">{pct.toFixed(0)}%</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-neutral-3/45 shadow-[inset_0_1px_2px_rgba(36,35,31,0.08)]">
                      <div
                        className="h-full rounded-full transition-[width] duration-[var(--dur-slow)] ease-[var(--ease-smooth)]"
                        style={{ width: `${pct}%`, backgroundImage: tone.bar, boxShadow: `0 0 8px ${tone.text}44` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="relative mt-3 flex items-center gap-1.5 text-[11px] text-muted">
              <Radio className="h-3 w-3" />
              每 2 秒自动刷新
            </p>
          </div>
        )}
      </CardContent>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="发起课堂投票">
        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <Label>问题 *</Label>
            <Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="如：这节课你掌握了多少？" />
          </div>
          <div className="space-y-1.5">
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
            <div className="relative rounded-[22px] bg-[linear-gradient(165deg,#ffffff,#fbf9f5)] p-4 shadow-[0_12px_30px_-16px_rgba(36,35,31,0.5),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-inset ring-line/70">
              <div className="pointer-events-none absolute inset-0 rounded-[22px] bg-[radial-gradient(circle_at_20%_0%,rgba(197,100,115,0.10),transparent_55%)]" />
              <div className="relative rounded-xl bg-white p-3">
                <QRCodeSVG value={`${typeof window !== "undefined" ? window.location.origin : ""}/poll/${qrOpen.id}`} size={200} fgColor="#24231f" bgColor="#ffffff" level="M" />
              </div>
              <p className="relative mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted">
                <Smartphone className="h-3 w-3" />
                手机扫码参与投票
              </p>
            </div>
            <div className="text-center">
              <p className="font-serif text-[17px] font-semibold">{qrOpen.question}</p>
              <p className="mt-1 text-sm text-muted">学生用手机扫码即可参与投票</p>
              <a href={`/poll/${qrOpen.id}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block rounded-full bg-[#f8e4e7]/60 px-2.5 py-1 text-xs text-primary-d transition-colors hover:bg-[#f8e4e7]">{"/poll/" + qrOpen.id}</a>
            </div>
          </div>
        )}
      </Dialog>
    </Card>
  );
}
