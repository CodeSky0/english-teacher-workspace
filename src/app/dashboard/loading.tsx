/**
 * 仪表盘路由级骨架屏
 * 用与真实布局同构的占位块替代单纯转圈，减少加载时的布局跳动（CLS）。
 */
function Bar({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`shimmer rounded-md bg-neutral-2 ${className}`} style={style} />;
}

function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-panel edge-lit shadow-paper-sm">
      <div className="flex flex-col gap-1 p-5 pb-4">
        <div className="flex items-center gap-2.5">
          <Bar className="h-7 w-7 rounded-md" />
          <Bar className="h-3.5 w-24" />
        </div>
        <Bar className="mt-2 h-2 w-32 opacity-70" />
      </div>
      <div className="space-y-2 px-5 pb-5">
        {Array.from({ length: lines }).map((_, i) => (
          <Bar key={i} className="h-2.5" style={{ width: `${88 - i * 12}%` }} />
        ))}
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-5" role="status" aria-label="加载中">
      {/* 页头占位 */}
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="h-4 w-[3px] rounded-full bg-neutral-3" />
            <Bar className="h-5 w-40" />
          </div>
          <Bar className="ml-[13px] h-2.5 w-56 opacity-70" />
        </div>
        <Bar className="h-9 w-28 rounded-md" />
      </div>

      {/* 卡片网格占位 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
      </div>

      {/* 列表占位 */}
      <div className="relative overflow-hidden rounded-xl bg-panel edge-lit shadow-paper-sm">
        <div className="flex items-center gap-3 border-b border-line px-5 py-3">
          <Bar className="h-3 w-20" />
          <Bar className="h-3 w-16 opacity-70" />
          <Bar className="h-3 w-16 opacity-70" />
        </div>
        <div className="divide-y divide-line/60">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <Bar className="h-8 w-8 rounded-md" />
              <Bar className="h-3" style={{ width: `${28 + ((i * 7) % 26)}%` }} />
              <Bar className="ml-auto h-3 w-14 opacity-70" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">加载中…</span>
    </div>
  );
}
