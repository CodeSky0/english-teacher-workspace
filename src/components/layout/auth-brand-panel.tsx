import { BookOpen, Headphones, GraduationCap, Sparkles } from "lucide-react";

export function AuthBrandPanel() {
  return (
    <div className="relative hidden lg:flex lg:flex-1 lg:flex-col lg:justify-between overflow-hidden texture-washi texture-suminagashi">
      {/* 暖光渐变背景层 — 缩小范围，更似灯笼光晕 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 25% 25%, rgba(245, 221, 224, 0.6) 0%, transparent 100%)," +
            "radial-gradient(ellipse 50% 40% at 75% 75%, rgba(221, 231, 240, 0.5) 0%, transparent 100%)",
        }}
      />

      {/* 装饰光晕 */}
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl animate-breathe" />
      <div className="absolute -left-12 bottom-1/4 h-40 w-40 rounded-full bg-[#3d6896]/10 blur-3xl animate-breathe" style={{ animationDelay: "2s" }} />

      {/* 装饰：右上角和风几何线条 */}
      <svg className="absolute right-8 top-24 h-32 w-32 text-primary/15" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="0.5" />
        <line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" strokeWidth="0.3" />
        <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" strokeWidth="0.3" />
      </svg>

      {/* 内容 */}
      <div className="relative z-10 flex flex-col justify-between p-12 h-full">
        {/* 顶部品牌 */}
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#a64953] text-lg font-medium text-white shadow-glow">
            英
          </span>
          <div>
            <span className="block font-serif text-xl font-medium tracking-wide text-neutral-9">
              英语教师工作台
            </span>
            <span className="block text-xs text-neutral-5 tracking-wider mt-0.5">
              English Teacher Workspace
            </span>
          </div>
        </div>

        {/* 中部标语 */}
        <div className="max-w-md">
          <h2 className="font-serif text-4xl font-medium leading-tight tracking-tight text-neutral-9">
            备课 · 教学 · 教研
            <br />
            <span className="text-gradient-ume">一体化工作台</span>
          </h2>
          <p className="mt-5 text-copy-15 leading-relaxed text-neutral-7">
            为中小学英语教师打造。词汇管理、听写批改、学情分析、课堂互动——
            让繁琐的日常教学事务，在一处优雅完成。
          </p>

          {/* 功能亮点 */}
          <div className="mt-8 grid grid-cols-2 gap-3">
            {[
              { icon: BookOpen, label: "词汇中心", desc: "单元管理", color: "#5c5a55", bg: "#e3e1db" },
              { icon: Headphones, label: "听写批改", desc: "自动统计", color: "#3d6896", bg: "#dde7f0" },
              { icon: GraduationCap, label: "学情分析", desc: "可视化", color: "#5e9f7e", bg: "#dcebe2" },
              { icon: Sparkles, label: "AI 助手", desc: "智能辅助", color: "#c56473", bg: "#f5dde0" },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.label}
                  className="group flex items-center gap-3 rounded-xl border border-line/50 bg-panel/70 px-4 py-3 backdrop-blur-md transition-all duration-[var(--dur-smooth)] ease-[var(--ease-smooth)] hover:bg-panel/90 hover:shadow-paper-sm"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-[var(--dur-quick)] ease-[var(--ease-spring)] group-hover:scale-110"
                    style={{ backgroundColor: f.bg, color: f.color }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-neutral-8">{f.label}</span>
                    <span className="block text-caption-10 text-neutral-5">{f.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 底部签名 — 朱印 + 和風設計 */}
        <div className="flex items-center gap-4">
          <span className="stamp-shu">英</span>
          <div className="divider-ink w-20" />
          <span className="font-serif text-sm tracking-wider text-neutral-6">
            Yohaku · 和風設計
          </span>
        </div>
      </div>
    </div>
  );
}
