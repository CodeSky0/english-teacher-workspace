import { cn } from "@/lib/utils";

export type BreakdownItem = {
  label: string;
  value: number;
  /** 主题色（建议用和色 hex，便于拼 alpha 渐变） */
  color: string;
  /** 可选的补充说明，如「占比 43%」 */
  note?: string;
};

/**
 * 横向分布条 BreakdownBars
 *
 * 用「标签 + 渐变进度条 + 衬线数字」替代纯表格数字，排行 / 类型分布一眼可读。
 * 纯展示、无客户端状态，服务端组件也能用。
 */
export function BreakdownBars({
  items,
  unit = "",
  className,
  max,
}: {
  items: BreakdownItem[];
  unit?: string;
  className?: string;
  /** 条形宽度基准：默认取最大值 */
  max?: number;
}) {
  const peak = max ?? Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((a, b) => a + b.value, 0);
  return (
    <div className={cn("space-y-2.5", className)}>
      {items.map((it) => {
        const pct = peak > 0 ? Math.max(it.value > 0 ? 6 : 0, (it.value / peak) * 100) : 0;
        return (
          <div key={it.label} className="group">
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-1.5 text-xs text-neutral-7">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: it.color, boxShadow: `0 0 5px ${it.color}66` }}
                />
                <span className="truncate">{it.label}</span>
              </span>
              <span className="shrink-0 text-[11px] tabular-nums text-muted">
                {it.note ?? (
                  <>
                    <b className="text-[12px] font-semibold tabular-nums text-text">{it.value}</b>
                    {unit}
                  </>
                )}
              </span>
            </div>
            <div className="mt-1.5 h-[5px] w-full overflow-hidden rounded-full bg-neutral-2/80">
              <div
                className="h-full rounded-full transition-[width] duration-[var(--dur-slow)] ease-[var(--ease-quick)]"
                style={{
                  width: pct + "%",
                  backgroundImage: `linear-gradient(90deg, ${it.color}66, ${it.color})`,
                  boxShadow: `0 0 6px ${it.color}55`,
                }}
              />
            </div>
          </div>
        );
      })}
      {total === 0 && <p className="py-2 text-xs text-muted">暂无数据</p>}
    </div>
  );
}

/**
 * 分段条 SegmentedBar
 *
 * 一条渐变色带按比例切分为若干段（状态 / 类型分布），下方带图例。
 * 用于「备课工作流」「周计划状态」「资源类型」这类占比展示。
 */
export function SegmentedBar({
  items,
  className,
  height = 8,
  unit = "",
  showLegend = true,
}: {
  items: BreakdownItem[];
  className?: string;
  height?: number;
  unit?: string;
  showLegend?: boolean;
}) {
  const visible = items.filter((i) => i.value > 0);
  const total = visible.reduce((a, b) => a + b.value, 0);
  return (
    <div className={cn("", className)}>
      <div
        className="flex w-full gap-[2px] overflow-hidden rounded-full bg-neutral-2/70 ring-1 ring-inset ring-line/50"
        style={{ height }}
      >
        {total === 0 ? null : (
          visible.map((it) => (
            <div
              key={it.label}
              title={`${it.label} ${it.value}${unit}`}
              className="h-full transition-[width] duration-[var(--dur-slow)] ease-[var(--ease-quick)] first:rounded-l-full last:rounded-r-full"
              style={{
                width: (it.value / total) * 100 + "%",
                backgroundImage: `linear-gradient(90deg, ${it.color}cc, ${it.color})`,
                boxShadow: `0 0 8px -1px ${it.color}66`,
              }}
            />
          ))
        )}
      </div>
      {showLegend && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {visible.length === 0 ? (
            <span className="text-[11px] text-muted">暂无数据</span>
          ) : (
            visible.map((it) => (
              <span key={it.label} className="inline-flex items-center gap-1.5 text-[11px] text-muted">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: it.color, boxShadow: `0 0 5px ${it.color}66` }}
                />
                {it.label}
                <b className="text-[12px] font-semibold tabular-nums text-text">
                  {it.value}
                  {unit}
                </b>
              </span>
            ))
          )}
        </div>
      )}
    </div>
  );
}
