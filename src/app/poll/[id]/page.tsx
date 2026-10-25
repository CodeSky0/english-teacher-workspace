"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoadingState } from "@/components/ui/states";
import { CheckCircle2, Vote, Users, Signal, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/error";

type PollOption = { id: string; label: string; voteCount: number };
type Poll = { id: string; question: string; type: string; options: PollOption[] };

/** 选项色阶：梅 / 縹 / 若竹 / 朽葉 —— 与设计体系同源 */
const OPTION_TONES = [
  {
    chip: "from-[#f8e4e7] to-[#f2d6da]",
    chipText: "#a64953",
    bar: "linear-gradient(90deg, #e3a0ab 0%, #c56473 55%, #b05564 100%)",
    glow: "rgba(197,100,115,0.42)",
    ring: "rgba(197,100,115,0.55)",
    soft: "rgba(197,100,115,0.10)",
  },
  {
    chip: "from-[#e3ecf4] to-[#d3e0ec]",
    chipText: "#3d6896",
    bar: "linear-gradient(90deg, #a8c4e0 0%, #6390be 55%, #3d6896 100%)",
    glow: "rgba(61,104,150,0.40)",
    ring: "rgba(61,104,150,0.55)",
    soft: "rgba(61,104,150,0.10)",
  },
  {
    chip: "from-[#e4f0e8] to-[#d5e8dc]",
    chipText: "#3d7a5e",
    bar: "linear-gradient(90deg, #a9d4bd 0%, #6fae8d 55%, #4a8f74 100%)",
    glow: "rgba(94,159,126,0.40)",
    ring: "rgba(94,159,126,0.55)",
    soft: "rgba(94,159,126,0.10)",
  },
  {
    chip: "from-[#f7ecda] to-[#f0e0c4]",
    chipText: "#8a6230",
    bar: "linear-gradient(90deg, #e6cb9f 0%, #c39c60 55%, #a87a3d 100%)",
    glow: "rgba(168,122,61,0.38)",
    ring: "rgba(168,122,61,0.52)",
    soft: "rgba(168,122,61,0.10)",
  },
];

const LETTER = ["A", "B", "C", "D", "E", "F", "G", "H"];

export default function PollPage({ params }: { params: Promise<{ id: string }> }) {
  const [pollId, setPollId] = useState<string>("");
  const [selected, setSelected] = useState<string | null>(null);
  const [voted, setVoted] = useState(false);
  const voterKeyRef = useRef<string>("");

  useEffect(() => {
    params.then((p) => setPollId(p.id));
  }, [params]);

  useEffect(() => {
    if (!voterKeyRef.current) {
      voterKeyRef.current = `voter-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  }, []);

  const qc = useQueryClient();

  const { data: pollData, isLoading, error } = useQuery({
    queryKey: ["poll", pollId],
    queryFn: () => apiClient.get<{ data: Poll }>(`/poll/${pollId}`),
    enabled: !!pollId,
    refetchInterval: 2500,
  });

  const poll = pollData?.data ?? null;
  const errorMsg = error ? getErrorMessage(error, "投票不存在") : null;

  const voteMut = useMutation({
    mutationFn: (optionId: string) =>
      apiClient.post<{ data: { options: PollOption[] } }>(`/poll/${pollId}/vote`, {
        optionId,
        voterKey: voterKeyRef.current,
      }),
    onSuccess: (res) => {
      setVoted(true);
      if (res.data?.options) {
        qc.setQueryData<{ data: Poll }>(["poll", pollId], (old) =>
          old ? { ...old, data: { ...old.data, options: res.data.options } } : old
        );
      }
    },
  });

  function handleVote(optionId: string) {
    if (!pollId || voted) return;
    setSelected(optionId);
    voteMut.mutate(optionId);
  }

  const totalVotes = poll?.options.reduce((sum, o) => sum + o.voteCount, 0) ?? 0;
  const leaderId = poll && totalVotes > 0
    ? [...poll.options].sort((a, b) => b.voteCount - a.voteCount)[0]?.id
    : null;

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#f7f4ee]">
      {/* ── 极光氛围：梅 / 縹 / 若竹 三团柔光 ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-[22%] -top-[16%] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(197,100,115,0.26),transparent_68%)] animate-drift" />
        <div className="absolute -right-[18%] top-[6%] h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,rgba(61,104,150,0.18),transparent_70%)] animate-drift" style={{ animationDelay: "-7s" }} />
        <div className="absolute -bottom-[20%] left-[14%] h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,rgba(94,159,126,0.18),transparent_70%)] animate-drift" style={{ animationDelay: "-13s" }} />
        <div className="absolute inset-0 grid-veil opacity-40" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.45),transparent_28%,transparent_72%,rgba(255,255,255,0.35))]" />
      </div>

      <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-[32rem] flex-col justify-center px-4 py-10 sm:px-6">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24">
            <LoadingState text="正在加载投票…" />
          </div>
        )}

        {!isLoading && errorMsg && (
          <div className="edge-lit relative overflow-hidden rounded-[26px] bg-panel/90 p-8 text-center shadow-paper-lg backdrop-blur-md animate-fade-in-up">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-[#f7dfe0] to-[#f0cfd1] text-[#a64953] ring-1 ring-inset ring-[#a64953]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
              <Vote className="h-7 w-7" />
            </div>
            <p className="font-serif text-xl font-semibold text-[#a64953]">{errorMsg}</p>
            <p className="mt-2 text-sm text-muted">请向老师确认投票链接是否正确</p>
          </div>
        )}

        {!isLoading && poll && (
          <div className="animate-fade-in-up">
            {/* ── 抬头 ── */}
            <header className="mb-7 text-center">
              <div className="mb-4 flex justify-center">
                <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-[22px] bg-[linear-gradient(160deg,#d0707f_0%,#c56473_52%,#a85463_100%)] text-white shadow-[0_14px_34px_-12px_rgba(168,84,99,0.75),inset_0_1px_0_rgba(255,255,255,0.38),inset_0_-1px_0_rgba(0,0,0,0.12)]">
                  <span className="absolute inset-0 rounded-[22px] ring-1 ring-inset ring-white/25" />
                  <Vote className="relative h-8 w-8" />
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#fdfaf5] text-[10px] shadow-[0_2px_6px_rgba(36,35,31,0.18)]">
                    <span className="h-2 w-2 rounded-full bg-[#5e9f7e] animate-breathe" />
                  </span>
                </span>
              </div>

              <p className="eyebrow flex items-center justify-center gap-2 text-[#b8556a]/80">
                <Signal className="h-3 w-3" />
                Live Poll
              </p>
              <h1 className="mt-2 font-serif text-[27px] font-semibold leading-[1.3] tracking-tight text-text sm:text-[31px]">
                {poll.question}
              </h1>
              <div className="mt-3 flex items-center justify-center gap-2 text-[13px] text-muted">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 ring-1 ring-inset ring-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  <Users className="h-3.5 w-3.5 text-[#3d6896]" />
                  <b className="font-medium tabular-nums text-text">{totalVotes}</b> 人参与
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 ring-1 ring-inset ring-white/80">
                  <Sparkles className="h-3.5 w-3.5 text-[#b8556a]" />
                  {voted ? "实时更新中" : "选择你的答案"}
                </span>
              </div>
            </header>

            {/* ── 选项 ── */}
            <div className="space-y-3">
              {poll.options.map((opt, i) => {
                const tone = OPTION_TONES[i % OPTION_TONES.length];
                const pct = totalVotes > 0 ? (opt.voteCount / totalVotes) * 100 : 0;
                const isSelected = selected === opt.id;
                const isLeader = voted && leaderId === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleVote(opt.id)}
                    disabled={voted}
                    aria-pressed={isSelected}
                    className={cn(
                      "group edge-lit relative w-full overflow-hidden rounded-[22px] p-4 text-left",
                      "min-h-[68px] transition-all duration-[var(--dur-smooth)] ease-[var(--ease-smooth)]",
                      voted ? "cursor-default" : "hover:-translate-y-[2px] active:scale-[0.99]",
                      isSelected
                        ? "bg-[linear-gradient(150deg,#ffffff,#fdf7f6)] shadow-[0_16px_36px_-22px_rgba(168,84,99,0.7),inset_0_1px_0_rgba(255,255,255,0.95)]"
                        : "bg-[linear-gradient(165deg,rgba(255,255,255,0.92),rgba(252,250,246,0.82))] shadow-[0_1px_2px_rgba(36,35,31,0.05),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-sm hover:shadow-paper-md"
                    )}
                    style={isSelected ? { boxShadow: `0 0 0 2px ${tone.ring}, 0 18px 40px -24px ${tone.glow}` } : undefined}
                  >
                    {/* 结果条：投票后从左侧生长 */}
                    {voted && (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0 left-0 transition-[width] duration-[900ms] ease-[var(--ease-quick)]"
                        style={{
                          width: `${pct}%`,
                          backgroundImage: tone.bar,
                          opacity: 0.16,
                        }}
                      />
                    )}
                    {voted && isSelected && (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px]"
                        style={{ backgroundImage: tone.bar, boxShadow: `0 0 12px ${tone.glow}` }}
                      />
                    )}

                    <span className="relative flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-gradient-to-b font-display text-[15px] font-semibold ring-1 ring-inset ring-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_2px_6px_-2px_rgba(36,35,31,0.18)] transition-transform duration-[var(--dur-quick)]",
                          tone.chip,
                          !voted && "group-hover:scale-105"
                        )}
                        style={{ color: tone.chipText }}
                      >
                        {LETTER[i] ?? i + 1}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="text-[16px] font-medium leading-snug text-text">{opt.label}</span>
                          {isLeader && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#f7ecda] px-1.5 py-[1px] text-[10px] font-medium text-[#8a6230] ring-1 ring-inset ring-[#a87a3d]/25">
                              <Sparkles className="h-2.5 w-2.5" />领先
                            </span>
                          )}
                        </span>
                        {voted && (
                          <span className="mt-1 flex h-1.5 w-full max-w-[13rem] overflow-hidden rounded-full bg-neutral-3/45">
                            <span
                              className="h-full rounded-full transition-[width] duration-[900ms] ease-[var(--ease-quick)]"
                              style={{ width: `${pct}%`, backgroundImage: tone.bar, boxShadow: `0 0 8px ${tone.glow}` }}
                            />
                          </span>
                        )}
                      </span>

                      {voted ? (
                        <span className="flex shrink-0 items-center gap-2">
                          {isSelected && <CheckCircle2 className="h-5 w-5" style={{ color: tone.chipText }} />}
                          <span className="text-right leading-none">
                            <span className="num-display block text-[24px] font-semibold tabular-nums" style={{ color: tone.chipText }}>
                              {pct.toFixed(0)}
                              <span className="text-[13px] font-medium">%</span>
                            </span>
                            <span className="mt-0.5 block text-[11px] tabular-nums text-muted">{opt.voteCount} 票</span>
                          </span>
                        </span>
                      ) : (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line/80 bg-white/60 text-neutral-5 transition-all duration-[var(--dur-quick)] group-hover:border-primary/45 group-hover:text-primary">
                          <CheckCircle2 className="h-4 w-4 opacity-40" />
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ── 提交反馈 ── */}
            {voted ? (
              <div className="mt-6 animate-scale-in">
                <div className="edge-lit relative overflow-hidden rounded-[22px] bg-[linear-gradient(150deg,rgba(228,240,232,0.9),rgba(255,255,255,0.75))] px-5 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_10px_28px_-20px_rgba(74,143,116,0.7)]">
                  <div className="flex items-center justify-center gap-2 text-[#3d7a5e]">
                    <span className="relative flex h-5 w-5 items-center justify-center">
                      <span className="absolute inset-0 rounded-full bg-[#5e9f7e]/25 animate-breathe" />
                      <CheckCircle2 className="relative h-5 w-5" />
                    </span>
                    <p className="text-sm font-medium">已提交，感谢参与</p>
                  </div>
                  <p className="mt-1 text-xs text-muted">结果会随同学投票实时更新</p>
                </div>
              </div>
            ) : (
              <p className="mt-6 text-center text-xs text-neutral-5">
                每人限投一次 · 提交后不可更改
              </p>
            )}
          </div>
        )}

        <footer className="mt-9 text-center">
          <p className="eyebrow text-[9px] text-neutral-5/80">English Teacher Workspace</p>
          <p className="mt-1.5 text-[11px] text-neutral-5">课堂投票 · 扫码即答 · 实时结果</p>
        </footer>
      </main>
    </div>
  );
}
