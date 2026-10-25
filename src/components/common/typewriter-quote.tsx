"use client";

import { useEffect, useState } from "react";

const QUOTES: readonly { text: string; author: string }[] = [
  { text: "The limits of my language mean the limits of my world.", author: "Ludwig Wittgenstein" },
  { text: "To have another language is to possess a second soul.", author: "Charlemagne" },
  { text: "A different language is a different vision of life.", author: "Federico Fellini" },
  { text: "One language sets you in a corridor for life. Two languages open every door along the way.", author: "Frank Smith" },
  { text: "Language is the dress of thought.", author: "Samuel Johnson" },
  { text: "The more languages you know, the more you are human.", author: "Tomáš Garrigue Masaryk" },
  { text: "Language is the road map of a culture.", author: "Rita Mae Brown" },
  { text: "Speak a new language so that the world will be a new world.", author: "Rumi" },
  { text: "With languages, you are at home anywhere.", author: "Edmund de Waal" },
  { text: "Learning is a treasure that will follow its owner everywhere.", author: "Chinese Proverb" },
];

type Phase = "type" | "hold" | "erase";

export function TypewriterQuote({ className }: { className?: string }) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [n, setN] = useState(0);
  const [phase, setPhase] = useState<Phase>("type");

  useEffect(() => {
    const full = QUOTES[idx].text;
    let t: ReturnType<typeof setTimeout>;
    if (phase === "type") {
      if (n < full.length) {
        t = setTimeout(() => setN(n + 1), 36);
      } else {
        t = setTimeout(() => setPhase("hold"), 450);
      }
    } else if (phase === "hold") {
      t = setTimeout(() => setPhase("erase"), 2800);
    } else if (n > 0) {
      t = setTimeout(() => setN(n - 1), 16);
    } else {
      t = setTimeout(() => {
        setIdx((i) => (i + 1) % QUOTES.length);
        setPhase("type");
      }, 320);
    }
    return () => clearTimeout(t);
  }, [idx, n, phase]);

  const q = QUOTES[idx];
  const done = n === q.text.length && phase !== "erase";
  return (
    <p className={className} aria-live="polite">
      <span className="whitespace-pre-wrap">{q.text.slice(0, n)}</span>
      <span className="ml-1 inline-block h-[1.05em] w-[2px] translate-y-[0.12em] animate-pulse rounded-full bg-current" aria-hidden />
      <span className="ml-2 transition-opacity duration-500" style={{ opacity: done ? 1 : 0 }}>
        — {q.author}
      </span>
    </p>
  );
}
