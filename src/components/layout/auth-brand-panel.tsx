import { BookOpen, Headphones, GraduationCap, Shuffle } from "lucide-react";
import { AuthAtmosphere } from "./auth-atmosphere";

/**
 * 浮动词云：低透明度白色英文单字，像散落在墨色纸面上的字迹
 */
const WORD_CLOUD = [
  { word: "curious", left: "4%", top: "15%", size: 26, opacity: 0.18, float: true, delay: "0s" },
  { word: "remarkable", left: "46%", top: "7%", size: 44, opacity: 0.10, float: true, delay: "1.2s" },
  { word: "imagine", left: "77%", top: "24%", size: 30, opacity: 0.12, float: false, delay: "0s" },
  { word: "articulate", left: "63%", top: "50%", size: 22, opacity: 0.13, float: false, delay: "0s" },
  { word: "eloquence", left: "70%", top: "58%", size: 36, opacity: 0.09, float: true, delay: "2.2s" },
  { word: "wonder", left: "28%", top: "77%", size: 54, opacity: 0.08, float: false, delay: "0s" },
  { word: "journey", left: "5%", top: "60%", size: 20, opacity: 0.18, float: false, delay: "0s" },
  { word: "nuance", left: "82%", top: "82%", size: 24, opacity: 0.12, float: false, delay: "0s" },
];

/** 功能标签：替代原先编造的数据条（不做任何假数字） */
const FEATURES = [
  { icon: BookOpen, label: "词汇管理", en: "Vocabulary", color: "#e8cfa8", bg: "rgba(168,122,61,0.26)" },
  { icon: Headphones, label: "听写批改", en: "Dictation", color: "#aecbe8", bg: "rgba(61,104,150,0.32)" },
  { icon: GraduationCap, label: "学情分析", en: "Analytics", color: "#a8d5bd", bg: "rgba(94,159,126,0.26)" },
  { icon: Shuffle, label: "课堂互动", en: "Classroom", color: "#f0b8c1", bg: "rgba(197,100,115,0.30)" },
];

export function AuthBrandPanel() {
  return (
    <div className="relative hidden min-h-screen overflow-hidden lg:flex lg:w-[52%] lg:shrink-0 lg:flex-col lg:justify-between">
      {/* 墨色极光 */}
      <AuthAtmosphere />

      {/* 右侧接缝：向内收的墨色渐变 + 一道细金线（与右侧暖纸面衔接） */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-[5] w-32 bg-[linear-gradient(90deg,transparent,rgba(16,10,18,0.5))]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-[6] w-px bg-[linear-gradient(180deg,transparent,rgba(233,196,160,0.6)_26%,rgba(233,196,160,0.38)_74%,transparent)]" />

      {/* 浮动词云 */}
      <div className="pointer-events-none absolute inset-0 select-none" aria-hidden="true">
        {WORD_CLOUD.map((w) => (
          <span
            key={w.word}
            className={`absolute font-display italic text-white ${w.float ? "animate-float" : ""}`}
            style={{
              left: w.left,
              top: w.top,
              fontSize: w.size,
              opacity: w.opacity,
              animationDelay: w.float ? w.delay : undefined,
            }}
          >
            {w.word}
          </span>
        ))}
      </div>

      {/* 同心圆轨道：右上（漂移） */}
      <svg
        className="animate-drift pointer-events-none absolute -right-24 -top-20 h-[30rem] w-[30rem] text-white/[0.10]"
        viewBox="0 0 200 200"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="100" cy="100" r="96" stroke="currentColor" strokeWidth="0.4" />
        <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 7" />
        <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="0.4" />
        <circle cx="100" cy="100" r="38" stroke="currentColor" strokeWidth="0.4" strokeDasharray="1 6" />
        <circle cx="100" cy="100" r="18" stroke="currentColor" strokeWidth="0.4" />
        <line x1="2" y1="100" x2="198" y2="100" stroke="currentColor" strokeWidth="0.25" />
        <line x1="100" y1="2" x2="100" y2="198" stroke="currentColor" strokeWidth="0.25" />
      </svg>

      {/* 同心圆轨道：左下（更淡） */}
      <svg
        className="pointer-events-none absolute -left-16 bottom-[-6rem] h-80 w-80 text-[#aecbe8]/[0.12]"
        viewBox="0 0 200 200"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="100" cy="100" r="92" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="100" cy="100" r="66" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 8" />
        <circle cx="100" cy="100" r="42" stroke="currentColor" strokeWidth="0.5" />
      </svg>

      {/* 右下角斜线组：呼应「一笔笺」 */}
      <div
        className="pointer-events-none absolute -right-10 bottom-24 h-40 w-40 opacity-[0.08]"
        style={{ backgroundImage: "repeating-linear-gradient(135deg, #ffffff 0 1px, transparent 1px 10px)" }}
      />

      {/* 英文水印：与总览 Hero 同一手法 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-10 right-2 select-none font-display text-[9rem] font-semibold leading-none tracking-tight text-white/[0.06]"
      >
        English
      </span>

      {/* ── 内容 ── */}
      <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
        {/* 品牌 */}
        <div className="flex items-center gap-3">
          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#e08a96_0%,#c56473_46%,#a64953_100%)] shadow-[0_6px_20px_-4px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.45)] ring-1 ring-white/30">
            <span className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_16%,rgba(255,255,255,0.68),transparent_58%)] opacity-70" />
            <span className="relative font-serif text-lg font-medium text-white">英</span>
            <span className="pointer-events-none absolute inset-[3px] rounded-[0.85rem] border border-white/25" />
          </span>
          <div>
            <span className="block font-serif text-[19px] tracking-wide text-white/95">英语教师工作台</span>
            <span className="eyebrow mt-1 block text-[9px] text-white/50">Yohaku · English Atelier</span>
          </div>
        </div>

        {/* 主标语 */}
        <div className="max-w-[31rem]">
          <p className="eyebrow flex items-center gap-2 text-white/50">
            English · Teaching · Atelier
            <span className="h-px w-10 bg-[linear-gradient(90deg,rgba(255,255,255,0.4),transparent)]" />
          </p>

          <h1 className="mt-4 font-display text-[84px] font-medium leading-[0.9] tracking-[-0.025em] text-white xl:text-[96px]">
            Teach
            <br />
            <span className="bg-[linear-gradient(112deg,#f9d3d8_0%,#e9bbc9_32%,#ccb9e8_66%,#a9cae6_100%)] bg-clip-text italic text-transparent">
              beautifully.
            </span>
          </h1>

          <p className="mt-6 font-serif text-[21px] leading-snug tracking-wide text-white/90 xl:text-[24px]">
            把每一堂英语课，
            <span className="relative inline-block">
              教成一束光
              <span className="absolute -bottom-0.5 left-0 h-[2px] w-full rounded-full bg-[linear-gradient(90deg,#e9a0ad,rgba(169,202,230,0.55),transparent)]" />
            </span>
            。
          </p>

          <p className="mt-4 max-w-sm text-[13.5px] leading-relaxed text-white/65">
            词汇管理、听写批改、学情分析、课堂互动与 AI 备课——
            让繁琐的日常教学事务，在一处优雅完成。
          </p>

          {/* 功能标签（不含任何数字） */}
          <div className="mt-8 grid max-w-md grid-cols-2 gap-2.5">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.label}
                  className="group flex items-center gap-2.5 rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2.5 transition-colors duration-[var(--dur-smooth)] hover:border-white/25 hover:bg-white/[0.10]"
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-[var(--dur-quick)] ease-[var(--ease-spring)] group-hover:scale-105"
                    style={{ backgroundColor: f.bg, color: f.color }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-medium leading-tight text-white/90">{f.label}</p>
                    <p className="eyebrow mt-0.5 text-[8px] text-white/45">{f.en}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 底部：朱印 + 落款 */}
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 rotate-[-6deg] items-center justify-center rounded-lg border-2 border-[#e9a8a1]/70 bg-[#a64953]/25 font-serif text-lg font-semibold text-[#f4c9c4] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
            英
          </span>
          <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(255,255,255,0.22),transparent)]" />
          <span className="font-serif text-[12px] tracking-[0.18em] text-white/50">YOHAKU · 和風設計</span>
        </div>
      </div>
    </div>
  );
}