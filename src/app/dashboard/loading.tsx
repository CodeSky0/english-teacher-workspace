/**
 * 仪表盘路由级骨架屏（Washi Aurora v4）
 *
 * 与真实布局同构：Hero 横幅 → 釉面统计卡 → 列表卡，
 * 材质沿用 edge-lit / inner-lit / 渐变底色，加载完成时几乎没有跳变（CLS ≈ 0）。
 */
function Bar({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`shimmer rounded-md bg-neutral-2 ${className}`} style={style} />;
}

function StatSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/70 bg-[linear-gradient(165deg,#ffffff_0%,#fdfcfa_52%,#f7f5f1_100%)] p-4 shadow-[0_1px_2px_rgba(36,35,31,0.05),inset_0_1px_0_rgba(255,255,255,0.95)]">
      <div className="absolute inset-x-0 top-0 h-12 bg-[radial-gradient(90%_100%_at_18%_0%,rgba(255,255,255,0.9),transparent)]" />
      <div className="relative flex items-start justify-between gap-2">
        <Bar className="h-10 w-10 rounded-[0.7rem]" />
        <Bar className="h-2 w-10 opacity-60" />
      </div>
      <Bar className="relative mt-4 h-7 w-16" />
      <Bar className="relative mt-2 h-2.5 w-20 opacity-70" />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-panel edge-lit shadow-paper-sm">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[radial-gradient(90%_100%_at_16%_0%,rgba(255,255,255,0.85),transparent)]" />
      <div className="relative flex items-center gap-3 border-b border-line/70 px-5 py-3.5">
        <Bar className="h-3 w-24" />
        <Bar className="h-2.5 w-16 opacity-60" />
        <Bar className="ml-auto h-2.5 w-14 opacity-60" />
      </div>
      <div className="relative divide-y divide-line/60">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3">
            <Bar className="h-8 w-8 rounded-lg" />
            <Bar className="h-2.5" style={{ width: `${28 + ((i * 7) % 26)}%` }} />
            <Bar className="ml-auto h-2.5 w-16 opacity-70" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-5" role="status" aria-label="加载中">
      {/* 页头占位：eyebrow + 衬线大标题 */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Bar className="h-2 w-24 opacity-60" />
          <div className="flex items-center gap-3">
            <span className="h-6 w-[3px] rounded-full bg-[linear-gradient(180deg,#e3e1db,#d5d3cc)]" />
            <Bar className="h-6 w-44" />
          </div>
          <Bar className="ml-[15px] h-2.5 w-56 opacity-70" />
        </div>
        <Bar className="h-9 w-28 rounded-lg" />
      </div>

      {/* Hero 占位 */}
      <div className="relative overflow-hidden rounded-[22px] border border-white/70 bg-[linear-gradient(112deg,#fdfbf9_0%,#faf8f4_40%,#f6f8fa_70%,#f4f8f5_100%)] p-6 shadow-[0_2px_14px_-4px_rgba(36,35,31,0.10)] sm:p-7 lg:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(197,100,115,0.12),transparent_66%)]" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(61,104,150,0.10),transparent_70%)]" />
        <div className="relative max-w-xl space-y-3">
          <Bar className="h-2 w-40 opacity-70" />
          <Bar className="h-7 w-[78%]" />
          <Bar className="h-7 w-[52%]" />
          <div className="flex flex-wrap gap-2 pt-2">
            <Bar className="h-8 w-24 rounded-lg" />
            <Bar className="h-8 w-24 rounded-lg" />
            <Bar className="h-8 w-28 rounded-lg opacity-70" />
          </div>
        </div>
        <div className="relative mt-6 flex items-center gap-4 rounded-2xl border border-white/70 bg-white/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] lg:absolute lg:right-8 lg:top-1/2 lg:mt-0 lg:-translate-y-1/2">
          <Bar className="h-20 w-20 rounded-full" />
          <div className="w-36 space-y-2">
            <Bar className="h-2 w-20 opacity-70" />
            <Bar className="h-2.5 w-full" />
            <Bar className="h-2 w-3/4 opacity-70" />
          </div>
        </div>
      </div>

      {/* 统计卡占位 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
      </div>

      {/* 列表占位 */}
      <ListSkeleton />
      <span className="sr-only">加载中…</span>
    </div>
  );
}
