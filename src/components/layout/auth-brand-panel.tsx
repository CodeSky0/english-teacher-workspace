import { BookOpen, Headphones, GraduationCap, Sparkles, TrendingUp, Quote } from "lucide-react";

const FEATURES = [
  { icon: BookOpen, label: "词汇中心", desc: "单元管理", color: "#5c5a55", bg: "#e3e1db" },
  { icon: Headphones, label: "听写批改", desc: "自动统计", color: "#3d6896", bg: "#dde7f0" },
  { icon: GraduationCap, label: "学情分析", desc: "可视化", color: "#5e9f7e", bg: "#dcebe2" },
  { icon: Sparkles, label: "AI 助手", desc: "智能辅助", color: "#c56473", bg: "#f5dde0" },
];

export function AuthBrandPanel() {
  return (
    <div className="relative hidden overflow-hidden lg:flex lg:w-[46%] lg:shrink-0 lg:flex-col lg:justify-between texture-washi">
      {/* ① 墨流渐变底：三色光晕缓慢漂移，制造「活」的背景 */}
      <div className="pointer-events-none absolute inset-0 animate-drift opacity-90">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 62% 52% at 22% 22%, rgba(245, 221, 224, 0.65) 0%, transparent 100%)," +
              "radial-gradient(ellipse 52% 42% at 78% 72%, rgba(221, 231, 240, 0.55) 0%, transparent 100%)," +
              "radial-gradient(ellipse 46% 38% at 62% 18%, rgba(220, 235, 226, 0.45) 0%, transparent 100%)",
          }}
        />
      </div>

      {/* ② 稿纸网格：压在渐变之上，增加质感层次 */}
      <div className="pointer-events-none absolute inset-0 grid-veil opacity-60" />

      {/* ③ 呼吸光斑 */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/12 blur-3xl animate-breathe" />
      <div
        className="pointer-events-none absolute -left-12 bottom-1/4 h-40 w-40 rounded-full bg-[#3d6896]/12 blur-3xl animate-breathe"
        style={{ animationDelay: "2s" }}
      />

      {/* ④ 和风几何：同心圆 + 十字准线 */}
      <svg
        className="pointer-events-none absolute right-10 top-24 h-36 w-36 text-primary/[0.14]"
        viewBox="0 0 100 100"
        fill="none"
        aria-hidden
      >
        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="0.5" />
        <line x1="8" y1="50" x2="92" y2="50" stroke="currentColor" strokeWidth="0.3" />
        <line x1="50" y1="8" x2="50" y2="92" stroke="currentColor" strokeWidth="0.3" />
      </svg>
      {/* ⑤ 右下角斜线组，呼应「一笔笺」 */}
      <div
        className="pointer-events-none absolute -right-8 bottom-24 h-40 w-40 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, #5c5a55 0 1px, transparent 1px 9px)",
        }}
      />

      {/* ── 内容 ── */}
      <div className="relative z-10 flex h-full flex-col justify-between p-12">
        {/* 顶部品牌 */}
        <div className="flex items-center gap-3">
          <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#cd6c7a] to-[#a64953] text-lg font-medium text-white shadow-[0_4px_10px_-2px_rgba(168,84,99,0.5),inset_0_1px_0_rgba(255,255,255,0.35)]">
            英
            <span className="absolute inset-[3px] rounded-[0.7rem] border border-white/25" />
          </span>
          <div>
            <span className="block font-serif text-xl font-medium tracking-wide text-neutral-9">
              英语教师工作台
            </span>
            <span className="mt-0.5 block text-[11px] tracking-[0.18em] text-neutral-5 uppercase">
              English Teacher Workspace
            </span>
          </div>
        </div>

        {/* 中部标语 */}
        <div className="max-w-md">
          {/* 引言符号 */}
          <Quote className="mb-4 h-6 w-6 -scale-y-100 text-primary/35" />

          <h2 className="font-serif text-[40px] font-medium leading-[1.2] tracking-tight text-neutral-9">
            备课 · 教学 · 教研
            <br />
            <span className="text-gradient-ume">一体化工作台</span>
          </h2>
          <p className="mt-5 text-copy-15 leading-relaxed text-neutral-7">
            为中小学英语教师打造。词汇管理、听写批改、学情分析、课堂互动——
            让繁琐的日常教学事务，在一处优雅完成。
          </p>

          {/* 功能亮点：玻璃卡 + 悬浮抬升 */}
          <div className="mt-8 grid grid-cols-2 gap-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.label}
                  className="group flex items-center gap-3 rounded-xl border border-line/60 bg-white/65 px-4 py-3 backdrop-blur-md transition-all duration-[var(--dur-smooth)] ease-[var(--ease-smooth)] hover:-translate-y-[2px] hover:border-primary/30 hover:bg-white/85 hover:shadow-paper-md"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-[var(--dur-quick)] ease-[var(--ease-spring)] group-hover:scale-110"
                    style={{ backgroundColor: f.bg, color: f.color }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-sm font-medium text-neutral-8">{f.label}</span>
                    <span className="block text-caption-10 text-neutral-5">{f.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 底部：数据条 + 朱印签名 */}
        <div>
          <div className="mb-6 flex items-center gap-4 rounded-xl border border-line/50 bg-white/55 px-4 py-3 backdrop-blur-md">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#dcebe2] text-[#3d7a5e]">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-neutral-8">班级平均正确率</p>
              <p className="text-caption-10 text-neutral-5">最近一次听写 · 全年级</p>
            </div>
            <span className="font-serif text-2xl font-medium tabular-nums text-[#3d7a5e]">92%</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="stamp-shu">英</span>
            <div className="divider-ink w-20" />
            <span className="font-serif text-sm tracking-wider text-neutral-6">
              Yohaku · 和風設計
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
