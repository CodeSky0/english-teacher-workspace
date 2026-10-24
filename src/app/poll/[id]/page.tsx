"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/states";
import { CheckCircle2, Vote, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type PollOption = { id: string; label: string; voteCount: number };
type Poll = { id: string; question: string; type: string; options: PollOption[] };

export default function PollPage({ params }: { params: Promise<{ id: string }> }) {
  const [pollId, setPollId] = useState<string>("");
  const [poll, setPoll] = useState<Poll | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const voterKeyRef = useRef<string>("");

  useEffect(() => {
    params.then((p) => setPollId(p.id));
  }, [params]);

  useEffect(() => {
    if (!voterKeyRef.current) {
      voterKeyRef.current = `voter-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  }, []);

  const fetchPoll = useCallback(async () => {
    if (!pollId) return;
    try {
      const res = await fetch(`/api/poll/${pollId}`);
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error?.message || "投票不存在");
        setLoading(false);
        return;
      }
      const json = await res.json();
      setPoll(json.data);
      setError(null);
      setLoading(false);
    } catch {
      setError("网络错误");
      setLoading(false);
    }
  }, [pollId]);

  useEffect(() => {
    fetchPoll();
    const interval = setInterval(fetchPoll, 2500);
    return () => clearInterval(interval);
  }, [fetchPoll]);

  async function handleVote(optionId: string) {
    if (!pollId || voted) return;
    setSelected(optionId);
    try {
      const res = await fetch(`/api/poll/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId, voterKey: voterKeyRef.current }),
      });
      if (res.ok) {
        const json = await res.json();
        setVoted(true);
        if (json.data?.options) {
          setPoll((p) => (p ? { ...p, options: json.data.options } : p));
        }
      }
    } catch {
      // 忽略，轮询会刷新
    }
  }

  const totalVotes = poll?.options.reduce((sum, o) => sum + o.voteCount, 0) ?? 0;

  if (loading) return <div className="flex min-h-screen items-center justify-center"><LoadingState /></div>;
  if (error) return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="max-w-md"><CardContent className="py-12 text-center">
        <p className="text-lg font-medium text-[#a64953]">{error}</p>
        <p className="mt-2 text-sm text-muted">请向老师确认投票链接是否正确</p>
      </CardContent></Card>
    </div>
  );
  if (!poll) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f9f8f5] to-[#f0efeb] p-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-[#c56473] to-[#b05564] text-white shadow-[0_8px_24px_-4px_rgba(168,84,99,0.4),inset_0_1px_0_rgba(255,255,255,0.3)]">
            <Vote className="h-7 w-7" />
          </div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-text">{poll.question}</h1>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted">
            <Users className="h-3.5 w-3.5" />{totalVotes} 人参与
          </p>
        </div>

        <div className="space-y-3">
          {poll.options.map((opt, i) => {
            const pct = totalVotes > 0 ? (opt.voteCount / totalVotes) * 100 : 0;
            const isSelected = selected === opt.id;
            const colors = [
              { bar: "from-[#c56473] to-[#b05564]", bg: "bg-[#f5dde0]", text: "text-[#c56473]" },
              { bar: "from-[#3d6896] to-[#2d5486]", bg: "bg-[#dde7f0]", text: "text-[#3d6896]" },
              { bar: "from-[#5e9f7e] to-[#4a8568]", bg: "bg-[#dcebe2]", text: "text-[#3d7a5e]" },
              { bar: "from-[#a87a3d] to-[#8a6230]", bg: "bg-[#f3e6d2]", text: "text-[#8a6230]" },
            ];
            const color = colors[i % colors.length];

            return (
              <button
                key={opt.id}
                onClick={() => handleVote(opt.id)}
                disabled={voted}
                className={cn(
                  "group relative w-full overflow-hidden rounded-xl border-2 p-4 text-left transition-all duration-[var(--dur-smooth)]",
                  voted ? "cursor-default" : "hover:-translate-y-[1px] hover:shadow-[var(--shadow-md)]",
                  isSelected ? cn("border-transparent", color.bg) : "border-line bg-panel hover:border-primary/30",
                )}
              >
                {voted && (
                  <div className={cn("absolute inset-y-0 left-0 bg-gradient-to-r opacity-20 transition-all duration-500", color.bar)} style={{ width: `${pct}%` }} />
                )}
                <div className="relative flex items-center justify-between">
                  <span className="flex items-center gap-2.5">
                    {isSelected && voted && <CheckCircle2 className={cn("h-5 w-5", color.text)} />}
                    <span className="font-medium">{opt.label}</span>
                  </span>
                  {voted && (
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums text-muted">{opt.voteCount}</span>
                      <span className={cn("text-sm font-bold tabular-nums", color.text)}>{pct.toFixed(0)}%</span>
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {voted && (
          <p className="mt-6 text-center text-sm text-muted">
            <CheckCircle2 className="mr-1 inline h-4 w-4 text-[#5e9f7e]" />
            已提交，实时更新中…
          </p>
        )}
      </div>
    </div>
  );
}
