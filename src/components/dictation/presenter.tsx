"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  Volume2, ChevronLeft, ChevronRight, Eye, EyeOff, Shuffle,
  Play, Pause, Grid3x3, X, Headphones,
} from "lucide-react";

type DictList = {
  id: string;
  name: string;
  classId: string | null;
  dictationDate: string | null;
  passType: string | null;
  passValue: number | null;
};
type DictWord = { id: string; word: string; meaning: string | null; scoreWeight: number };

type Mode = "card" | "grid";

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.9;
  speechSynthesis.speak(u);
}

function shuffle(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function DictationPresenter({ listId }: { listId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("card");

  const { data: listsData } = useQuery({
    queryKey: ["dict-lists"],
    queryFn: () => apiClient.get<{ data: DictList[] }>("/dictation/lists"),
  });
  const list = useMemo(
    () => (listsData?.data ?? []).find((l) => l.id === listId) ?? null,
    [listsData, listId]
  );

  const { data: wordsData, isLoading } = useQuery({
    queryKey: ["dict-words", listId],
    queryFn: () => apiClient.get<{ data: DictWord[] }>(`/dictation/words?listId=${listId}`),
  });
  const words = useMemo(() => wordsData?.data ?? [], [wordsData]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070a14] text-white">
      {/* 极光背景 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-[10%] -top-[12%] h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle,rgba(197,100,115,0.22),transparent_65%)] animate-drift" />
        <div className="absolute -right-[8%] top-[6%] h-[42rem] w-[42rem] rounded-full bg-[radial-gradient(circle,rgba(61,104,150,0.26),transparent_66%)] animate-drift" style={{ animationDelay: "-9s" }} />
        <div className="absolute -bottom-[18%] left-[22%] h-[38rem] w-[38rem] rounded-full bg-[radial-gradient(circle,rgba(94,159,126,0.18),transparent_68%)] animate-drift" style={{ animationDelay: "-16s" }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(255,255,255,0.08),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_38%,rgba(2,3,8,0.72)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:24px_24px] opacity-50" />
      </div>

      {/* 顶部栏 */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-6 py-4 sm:px-10">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(160deg,#d1707f,#a85463)] shadow-[0_10px_28px_-12px_rgba(197,100,115,0.8),inset_0_1px_0_rgba(255,255,255,0.28)]">
            <Headphones className="h-5 w-5 text-white" />
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Dictation Presenter</p>
            <h1 className="font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">
              {list?.name ?? "听写大屏"}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-white/12 bg-white/[0.05] p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] backdrop-blur-sm">
            <button
              onClick={() => setMode("card")}
              className={cn(
                "min-h-[36px] rounded-lg px-3.5 text-sm transition-all duration-[var(--dur-quick)]",
                mode === "card" ? "bg-white/[0.14] font-medium text-white shadow-[0_1px_0_rgba(255,255,255,0.15)_inset]" : "text-white/45 hover:text-white/80"
              )}
            >
              逐词播放
            </button>
            <button
              onClick={() => setMode("grid")}
              className={cn(
                "min-h-[36px] rounded-lg px-3.5 text-sm transition-all duration-[var(--dur-quick)]",
                mode === "grid" ? "bg-white/[0.14] font-medium text-white shadow-[0_1px_0_rgba(255,255,255,0.15)_inset]" : "text-white/45 hover:text-white/80"
              )}
            >
              整表总览
            </button>
          </div>
          <button
            onClick={() => router.push("/dashboard/dictation")}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/18 bg-transparent px-4 text-sm text-white/80 transition-all duration-[var(--dur-quick)] hover:border-white/30 hover:bg-white/[0.06]"
          >
            <X className="h-4 w-4" />退出大屏
          </button>
        </div>
      </header>

      <main className="relative z-10 px-6 pb-10 sm:px-10">
        {isLoading ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <p className="text-white/50">加载中…</p>
          </div>
        ) : words.length === 0 ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <p className="text-white/50">该词表暂无单词</p>
          </div>
        ) : mode === "card" ? (
          <CardMode words={words} />
        ) : (
          <GridMode words={words} />
        )}
      </main>
    </div>
  );
}

/** 模式一：逐词播放 */
function CardMode({ words }: { words: DictWord[] }) {
  const [order, setOrder] = useState<number[]>(() => Array.from({ length: words.length }, (_, i) => i));
  const [pos, setPos] = useState(0);
  const [showWord, setShowWord] = useState(false);
  const [showMeaning, setShowMeaning] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const index = order[pos] ?? 0;
  const current = words[index];

  const go = useCallback((delta: number) => {
    setPos((p) => Math.min(words.length - 1, Math.max(0, p + delta)));
    setShowWord(false);
  }, [words.length]);

  const toggleShuffle = useCallback(() => {
    if (shuffled) {
      setOrder(Array.from({ length: words.length }, (_, i) => i));
      setShuffled(false);
    } else {
      setOrder(shuffle(words.length));
      setShuffled(true);
    }
    setPos(0);
    setShowWord(false);
  }, [shuffled, words.length]);

  // 自动播放
  useEffect(() => {
    if (!autoPlay) {
      if (autoTimer.current) clearInterval(autoTimer.current);
      return;
    }
    autoTimer.current = setInterval(() => {
      setPos((p) => {
        if (p >= words.length - 1) {
          setAutoPlay(false);
          return p;
        }
        return p + 1;
      });
      setShowWord(false);
    }, 3000);
    return () => {
      if (autoTimer.current) clearInterval(autoTimer.current);
    };
  }, [autoPlay, words.length]);

  // 进入新词自动朗读
  useEffect(() => {
    if (current) speak(current.word);
  }, [current]);

  // 键盘：← → 切换、空格 显隐、A 自动播放
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      else if (e.key === " ") { e.preventDefault(); setShowWord((v) => !v); }
      else if (e.key === "a" || e.key === "A") { e.preventDefault(); setAutoPlay((v) => !v); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [go]);

  if (!current) return null;

  return (
    <div className="flex flex-col items-center">
      {/* 超大单词卡 */}
      <div className="relative mb-8 flex min-h-[44vh] w-full max-w-5xl items-center justify-center overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(170deg,rgba(255,255,255,0.07),rgba(255,255,255,0.015))] px-6 py-12 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_40px_90px_-50px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:px-10">
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(197,100,115,0.22),transparent_68%)]" />
        <div className="pointer-events-none absolute -bottom-20 -right-14 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(61,104,150,0.22),transparent_68%)]" />
        <div className="relative text-center">
          <p className="mb-3 text-[13px] uppercase tracking-[0.22em] text-white/40">
            No. {pos + 1} / {words.length}{shuffled ? " · 随机" : ""}
          </p>
          <p
            key={current.id}
            className={cn(
              "animate-scale-in bg-[linear-gradient(115deg,#f7e7c8_0%,#f3c8d1_38%,#c9d6ee_70%,#b9e0c8_100%)] bg-clip-text font-display font-semibold tracking-tight text-transparent drop-shadow-[0_0_30px_rgba(229,164,177,0.18)]",
              showWord ? "text-[72px] sm:text-[104px]" : "text-[72px] sm:text-[104px]"
            )}
          >
            {showWord ? current.word : "●"}
          </p>
          {showWord && showMeaning && current.meaning && (
            <p className="mt-4 animate-scale-in text-2xl text-white/65 sm:text-3xl">{current.meaning}</p>
          )}
          {!showWord && (
            <p className="mt-4 text-base text-white/40">按空格显示拼写</p>
          )}
        </div>
      </div>

      {/* 控制条 */}
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <PresenterBtn onClick={() => go(-1)} variant="outline" disabled={pos === 0}>
          <ChevronLeft className="h-4 w-4" />上一词
        </PresenterBtn>
        <PresenterBtn onClick={() => speak(current.word)} variant="soft">
          <Volume2 className="h-4 w-4" />朗读
        </PresenterBtn>
        <PresenterBtn onClick={() => setShowWord((v) => !v)} variant="soft">
          {showWord ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showWord ? "隐藏" : "显示"}
        </PresenterBtn>
        <PresenterBtn onClick={() => setShowMeaning((v) => !v)} variant="outline">
          释义{showMeaning ? "开" : "关"}
        </PresenterBtn>
        <PresenterBtn onClick={() => setAutoPlay((v) => !v)} variant={autoPlay ? "primary" : "outline"}>
          {autoPlay ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {autoPlay ? "暂停" : "自动"}
        </PresenterBtn>
        <PresenterBtn onClick={toggleShuffle} variant={shuffled ? "primary" : "outline"}>
          <Shuffle className="h-4 w-4" />{shuffled ? "随机中" : "随机"}
        </PresenterBtn>
        <PresenterBtn onClick={() => go(1)} variant="outline" disabled={pos === words.length - 1}>
          下一词<ChevronRight className="h-4 w-4" />
        </PresenterBtn>
      </div>
      <p className="mt-5 text-[12px] text-white/40">键盘：← → 切换 · 空格 显隐拼写 · A 自动播放</p>
    </div>
  );
}

/** 模式二：整表总览 */
function GridMode({ words }: { words: DictWord[] }) {
  const [speakIdx, setSpeakIdx] = useState<number | null>(null);
  return (
    <div>
      <div className="mb-5 flex items-center gap-2 text-white/55">
        <Grid3x3 className="h-4 w-4" />
        <p className="text-sm">共 {words.length} 词 · 点击卡片可朗读</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {words.map((w, i) => (
          <button
            key={w.id}
            onClick={() => { speak(w.word); setSpeakIdx(i); }}
            className={cn(
              "group relative flex min-h-[140px] flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015))] p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] transition-transform duration-[var(--dur-quick)] hover:-translate-y-[2px]",
              speakIdx === i && "ring-2 ring-[#e5a4b1]/50"
            )}
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(197,100,115,0.16),transparent_68%)] opacity-0 transition-opacity duration-[var(--dur-quick)] group-hover:opacity-100" />
            <span className="num-display text-[11px] tabular-nums text-white/35">{String(i + 1).padStart(2, "0")}</span>
            <span className="font-display text-2xl font-semibold tracking-tight text-white sm:text-[26px]">{w.word}</span>
            {w.meaning && <span className="text-sm text-white/55">{w.meaning}</span>}
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/45">
              <Volume2 className="h-3 w-3" />朗读
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

type BtnVariant = "primary" | "soft" | "outline";

function PresenterBtn({
  children,
  onClick,
  variant = "primary",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-medium text-white/90",
        "transition-[transform,box-shadow,background-color,border-color] duration-[var(--dur-smooth)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e5a4b1]/50",
        "disabled:pointer-events-none disabled:opacity-40 active:scale-[0.97]",
        variant === "primary" &&
          "bg-[linear-gradient(180deg,#d1707f_0%,#c56473_52%,#a85463_100%)] shadow-[0_10px_28px_-12px_rgba(197,100,115,0.8),inset_0_1px_0_rgba(255,255,255,0.28)] hover:-translate-y-[1px] hover:brightness-[1.06]",
        variant === "soft" && "border border-white/12 bg-white/[0.075] hover:border-white/25 hover:bg-white/[0.11]",
        variant === "outline" && "border border-white/18 bg-transparent hover:border-white/30 hover:bg-white/[0.06]"
      )}
    >
      {children}
    </button>
  );
}
