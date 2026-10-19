"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

type Student = {
  id: string;
  name: string;
  enName?: string | null;
  seatNo?: number | null;
  studentNo?: string | null;
};

type DrumPhase = "idle" | "spinning" | "strike" | "reveal";

interface ThunderDrumProps {
  picked: Student | null;
  rolling: boolean;
  className?: string;
}

const SAKURA_KEYS = Array.from({ length: 12 }, (_, i) => i);
const LIGHTNING_BOLTS = [
  { rotate: 0, delay: 0 },
  { rotate: 45, delay: 60 },
  { rotate: 90, delay: 30 },
  { rotate: 135, delay: 90 },
  { rotate: 180, delay: 45 },
  { rotate: 225, delay: 75 },
  { rotate: 270, delay: 15 },
  { rotate: 315, delay: 50 },
];
const RIVET_COUNT = 12;
const RIVETS = Array.from({ length: RIVET_COUNT }, (_, i) => (i * 360) / RIVET_COUNT);

export function ThunderDrum({ picked, rolling, className }: ThunderDrumProps) {
  const [phase, setPhase] = useState<DrumPhase>("idle");

  useEffect(() => {
    if (rolling) {
      setPhase("spinning");
    } else if (picked) {
      setPhase("strike");
      const t = setTimeout(() => setPhase("reveal"), 650);
      return () => clearTimeout(t);
    } else {
      setPhase("idle");
    }
  }, [rolling, picked]);

  const showLightning = phase === "strike";
  const showReveal = phase === "reveal";

  return (
    <div
      className={cn(
        "relative flex min-h-[400px] flex-col items-center justify-center overflow-hidden",
        className,
      )}
    >
      {/* 雷纹底纹 */}
      <div className="texture-raimon pointer-events-none absolute inset-0 animate-raiju-pulse" />

      {/* 两侧灯笼 */}
      <Lantern className="absolute left-4 top-6 animate-lantern-sway" />
      <Lantern
        className="absolute right-4 top-6 animate-lantern-sway"
        style={{ animationDelay: "0.5s" }}
      />

      {/* 樱花 */}
      {phase === "spinning" && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {SAKURA_KEYS.map((k) => (
            <span
              key={k}
              className="sakura-petal"
              style={{
                left: `${(k * 8 + 5) % 94}%`,
                animationDelay: `${(k * 0.15) % 1.5}s`,
                animationDuration: `${1.6 + (k % 4) * 0.35}s`,
                ["--sx" as string]: `${((k * 7) % 50) - 25}px`,
              } as CSSProperties}
            />
          ))}
        </div>
      )}

      {/* 闪白 */}
      {showLightning && (
        <div className="animate-screen-flash pointer-events-none absolute inset-0 z-30 bg-white" />
      )}

      {/* 雷电 */}
      {showLightning && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <svg className="absolute h-72 w-72" viewBox="0 0 200 200">
            <defs>
              <filter id="lightning-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {LIGHTNING_BOLTS.map((bolt, i) => (
              <g
                key={i}
                className="animate-lightning"
                style={{
                  transformOrigin: "100px 100px",
                  transform: `rotate(${bolt.rotate}deg)`,
                  animationDelay: `${bolt.delay}ms`,
                }}
                filter="url(#lightning-glow)"
              >
                <path
                  d="M100 100 L86 72 L92 68 L80 44 L88 40 L74 8"
                  stroke="#fffbe0"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M100 100 L92 70 L96 66"
                  stroke="#f4d97a"
                  strokeWidth="1.2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.8"
                />
              </g>
            ))}
          </svg>
        </div>
      )}

      {/* 波纹 */}
      {showLightning && (
        <div className="pointer-events-none absolute inset-0 z-15 flex items-center justify-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-shockwave absolute h-44 w-44 rounded-full border-2 border-[#f4d97a]/70"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
      )}

      {/* 光柱 */}
      {showReveal && (
        <div
          className="animate-light-beam pointer-events-none absolute left-1/2 top-[28%] z-5 h-64 w-28 -translate-x-1/2 rounded-full bg-gradient-to-t from-[#f4d97a]/55 via-[#f4d97a]/20 to-transparent blur-xl"
          style={{ transformOrigin: "bottom center" }}
        />
      )}

      {/* 中央内容 */}
      <div className="relative z-10 flex flex-col items-center">
        {/* 姓名大字（reveal 时，鼓上方） */}
        {showReveal && picked && (
          <div className="mb-5 flex flex-col items-center">
            <div
              key={picked.id}
              className="flex flex-col items-center font-serif font-bold tracking-tight text-primary-d"
            >
              {picked.name.split("").map((ch, i) => (
                <span
                  key={i}
                  className="animate-name-brush text-5xl"
                  style={{ animationDelay: `${i * 110}ms` }}
                >
                  {ch}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 太鼓 */}
        <div
          className={cn(
            "relative",
            phase === "spinning" && "animate-taiko-spin",
            phase === "strike" && "animate-taiko-quake",
          )}
        >
          <DrumFace />
          {/* 鼓面光晕 */}
          {phase === "spinning" && (
            <div className="animate-drum-glow pointer-events-none absolute inset-0 rounded-full bg-[#ff3b3b]/35 blur-2xl" />
          )}
          {/* 中央"雷"字 */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span
              className={cn(
                "font-serif text-5xl font-bold text-[#f4d97a]",
                phase === "spinning" && "animate-name-flicker",
                phase === "idle" && "drop-shadow-[0_0_12px_rgba(244,217,122,0.4)]",
              )}
            >
              雷
            </span>
          </div>
        </div>

        {/* 鼓槌 */}
        <Drumstick side="left" active={phase === "spinning"} />
        <Drumstick side="right" active={phase === "spinning"} />

        {/* 疾闪姓名（spinning，鼓下方） */}
        {phase === "spinning" && picked && (
          <div
            key={picked.id}
            className="animate-name-flicker mt-6 font-serif text-3xl font-bold tracking-tight text-[#f4d97a]"
          >
            {picked.name}
          </div>
        )}

        {/* 朱印 + 墨迹（reveal，鼓下方） */}
        {showReveal && picked && (
          <div className="relative mt-6 flex flex-col items-center">
            <div className="relative">
              <div
                key={`stamp-${picked.id}`}
                className="animate-stamp-drop flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#b83a3a] bg-gradient-to-br from-[#d94545] to-[#b82828] text-[10px] font-bold text-white/95 shadow-[0_2px_8px_rgba(184,40,40,0.45)]"
              >
                当选
              </div>
              <div className="animate-ink-spread pointer-events-none absolute inset-0 rounded-full bg-[#b83a3a]/25 blur-md" />
            </div>
            <div className="animate-fade-in-up mt-2 text-sm text-muted">
              {picked.enName ? `${picked.enName} · ` : ""}
              {picked.seatNo != null ? `${picked.seatNo} 号` : "未排座"}
              {picked.studentNo ? ` · ${picked.studentNo}` : ""}
            </div>
          </div>
        )}

        {/* idle 提示 */}
        {phase === "idle" && (
          <div className="mt-6 text-sm text-muted">点击「开始抽取」擂鼓</div>
        )}
      </div>
    </div>
  );
}

function DrumFace() {
  return (
    <svg
      viewBox="0 0 200 200"
      className="h-52 w-52 drop-shadow-[0_10px_20px_rgba(74,14,14,0.45)]"
    >
      <defs>
        <linearGradient id="goldRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f4d97a" />
          <stop offset="50%" stopColor="#c9a227" />
          <stop offset="100%" stopColor="#f4d97a" />
        </linearGradient>
        <radialGradient id="drumFace" cx="0.4" cy="0.35">
          <stop offset="0%" stopColor="#a02828" />
          <stop offset="55%" stopColor="#6b1414" />
          <stop offset="100%" stopColor="#3a0808" />
        </radialGradient>
        <radialGradient id="rivet" cx="0.3" cy="0.3">
          <stop offset="0%" stopColor="#fce8a0" />
          <stop offset="100%" stopColor="#a07820" />
        </radialGradient>
      </defs>
      {/* 外圈金属环 */}
      <circle cx="100" cy="100" r="96" fill="none" stroke="url(#goldRing)" strokeWidth="7" />
      <circle cx="100" cy="100" r="92" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
      {/* 鼓面漆面 */}
      <circle cx="100" cy="100" r="88" fill="url(#drumFace)" />
      {/* 内圈金线装饰 */}
      <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(244,217,122,0.3)" strokeWidth="1" />
      <circle cx="100" cy="100" r="72" fill="none" stroke="rgba(244,217,122,0.15)" strokeWidth="1" />
      {/* 铆钉 */}
      {RIVETS.map((deg, i) => {
        const rad = ((deg - 90) * Math.PI) / 180;
        const x = 100 + 90 * Math.cos(rad);
        const y = 100 + 90 * Math.sin(rad);
        return <circle key={i} cx={x} cy={y} r="3.5" fill="url(#rivet)" />;
      })}
      {/* 高光 */}
      <ellipse cx="78" cy="68" rx="22" ry="14" fill="rgba(255,255,255,0.08)" />
    </svg>
  );
}

function Lantern({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div className={cn("flex flex-col items-center", className)} style={style}>
      <div className="h-4 w-px bg-[#3a2a1a]/40" />
      <div className="h-1.5 w-9 rounded-t bg-[#3a2a1a]" />
      <div className="relative h-11 w-11 rounded-full bg-gradient-to-b from-[#d94545] via-[#c52828] to-[#a02020] shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),0_2px_8px_rgba(166,73,83,0.45)]">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[#3a2a1a]/30" />
        <span className="absolute inset-0 flex items-center justify-center font-serif text-sm font-bold text-[#f4d97a]/90">
          雷
        </span>
      </div>
      <div className="h-1.5 w-9 rounded-b bg-[#3a2a1a]" />
      <div className="h-3 w-px bg-[#b83a3a]/60" />
    </div>
  );
}

function Drumstick({ side, active }: { side: "left" | "right"; active: boolean }) {
  return (
    <div
      className={cn(
        "absolute bottom-10 z-5 h-1.5 w-24 origin-bottom rounded-full bg-gradient-to-r from-[#8b6a3a] to-[#3a2a1a] shadow-sm",
        side === "left"
          ? cn("left-1 rotate-[-22deg]", active && "animate-drumstick-left")
          : cn("right-1 rotate-[22deg]", active && "animate-drumstick-right"),
      )}
    >
      <div
        className={cn(
          "absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#5a3a1a] to-[#2a1a0a] shadow-sm",
          side === "left" ? "-left-1.5" : "-right-1.5",
        )}
      />
    </div>
  );
}
