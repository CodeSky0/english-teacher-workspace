"use client";

import { cn } from "@/lib/utils";

/**
 * 玻璃 tooltip —— 所有 Recharts 图表统一使用
 *
 * 半透明白玻璃 + 顶部内高光 + 大扩散阴影，悬浮在图表上方。
 * 每行：色点 + 系列名 + 右对齐的等宽数字。
 */
type TooltipEntry = {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
};

export function GlassTooltip({
  active,
  payload,
  label,
  suffix = "",
  decimals = 1,
  className,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className={cn(
        "min-w-[8.5rem] rounded-xl border border-white/85 bg-[rgba(255,255,255,0.93)] px-3 py-2 backdrop-blur-xl",
        className
      )}
      style={{
        boxShadow:
          "0 22px 44px -18px rgba(58,42,45,0.42), 0 2px 6px -2px rgba(36,35,31,0.10), inset 0 1px 0 rgba(255,255,255,0.95)",
      }}
    >
      {label != null && label !== "" && (
        <p className="eyebrow text-[9px] text-neutral-6">{String(label)}</p>
      )}
      <div className="mt-1.5 space-y-1">
        {payload.map((entry, i) => {
          const value = entry.value;
          const text =
            typeof value === "number"
              ? Number.isInteger(value)
                ? String(value)
                : value.toFixed(decimals)
              : (value ?? "—");
          return (
            <div key={String(entry.dataKey ?? i)} className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: entry.color ?? "#c56473",
                  boxShadow: `0 0 6px ${entry.color ?? "#c56473"}66`,
                }}
              />
              <span className="text-[11px] text-neutral-7">{entry.name ?? entry.dataKey}</span>
              <span className="num-display ml-auto text-[13px] font-semibold tabular-nums text-text">
                {text}
                {suffix}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
