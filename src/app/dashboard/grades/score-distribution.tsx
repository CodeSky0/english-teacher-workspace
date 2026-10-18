"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

/** 分数段：和色映射 + 中文标签 */
const BANDS = [
  { label: "待提升", min: 0, max: 59, color: "#a64953", from: "#c97b85", to: "#a64953" },
  { label: "及格", min: 60, max: 74, color: "#a87a3d", from: "#c9a066", to: "#a87a3d" },
  { label: "良好", min: 75, max: 89, color: "#3d6896", from: "#6b95c0", to: "#3d6896" },
  { label: "优秀", min: 90, max: 100, color: "#5e9f7e", from: "#84bfa1", to: "#5e9f7e" },
];

const bandOf = (v: number) => BANDS.find((b) => v >= b.min && v <= b.max) ?? BANDS[0];

type Props = { totals: number[] };

export function ScoreDistribution({ totals }: Props) {
  /** 10 分一档的直方图 */
  const histogram = useMemo(() => {
    const buckets = Array.from({ length: 10 }, (_, i) => ({
      low: i * 10,
      high: i === 9 ? 100 : i * 10 + 10,
      count: 0,
    }));
    for (const t of totals) {
      const idx = Math.min(9, Math.max(0, Math.floor(t / 10)));
      buckets[idx].count++;
    }
    const peak = Math.max(1, ...buckets.map((b) => b.count));
    return { buckets, peak };
  }, [totals]);

  /** 四个分数段的人数占比 */
  const bands = useMemo(() => {
    const counts = BANDS.map((b) => ({ ...b, count: totals.filter((t) => t >= b.min && t <= b.max).length }));
    const total = counts.reduce((a, b) => a + b.count, 0) || 1;
    return counts.map((c) => ({ ...c, pct: (c.count / total) * 100 }));
  }, [totals]);

  const avg = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
  const passRate = totals.length ? (totals.filter((t) => t >= 60).length / totals.length) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[15px]">
          <span className="icon-slot">
            <BarChart3 />
          </span>
          分数分布
          <span className="ml-auto flex items-center gap-3 text-xs font-normal text-muted">
            <span>均分 <b className="font-serif text-[13px] font-semibold tabular-nums text-primary-d">{avg.toFixed(1)}</b></span>
            <span className="text-[#c9c6bd]">|</span>
            <span>及格率 <b className="font-serif text-[13px] font-semibold tabular-nums text-[#3d7a5e]">{passRate.toFixed(0)}%</b></span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* 分段占比条 */}
        <div className="mb-1 flex h-2.5 w-full overflow-hidden rounded-full bg-neutral-2 shadow-[inset_0_1px_2px_rgba(36,35,31,0.07)]">
          {bands.filter((b) => b.count > 0).map((b) => (
            <div key={b.label} title={`${b.label} ${b.count} 人`}
              className="h-full transition-all duration-[var(--dur-slow)] ease-[var(--ease-smooth)] first:rounded-l-full last:rounded-r-full"
              style={{ width: `${b.pct}%`, backgroundColor: b.color, opacity: 0.85 }} />
          ))}
        </div>
        <div className="mb-4 mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
          {bands.map((b) => (
            <div key={b.label} className="flex items-center gap-1.5 text-xs">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />
              <span className="text-neutral-7">{b.label}</span>
              <span className="tabular-nums text-muted">{b.count}人 · {b.pct.toFixed(0)}%</span>
            </div>
          ))}
        </div>

        {/* 直方图：纯 CSS 柱体，零图表库依赖 */}
        <div className="rounded-lg border border-line/60 bg-gradient-to-b from-white to-[#fcfbf9] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          <div className="flex h-[150px] items-end gap-1.5">
            {histogram.buckets.map((b, i) => {
              const band = bandOf(b.low + 5);
              const h = b.count === 0 ? 3 : Math.max(6, (b.count / histogram.peak) * 100);
              return (
                <div key={i} className="group/bar relative flex h-full flex-1 flex-col justify-end">
                  {/* 悬浮计数 */}
                  <span className="pointer-events-none absolute left-1/2 bottom-full z-10 mb-1 -translate-x-1/2 rounded-md border border-line bg-panel px-1.5 py-0.5 text-[10px] tabular-nums text-neutral-7 opacity-0 shadow-[var(--shadow-sm)] transition-opacity duration-[var(--dur-quick)] group-hover/bar:opacity-100">
                    {b.count} 人
                  </span>
                  <div
                    className="bar-grow w-full rounded-t-[4px] transition-[filter] duration-[var(--dur-quick)] group-hover/bar:brightness-110"
                    style={{
                      height: `${h}%`,
                      "--i": i,
                      backgroundImage: b.count ? `linear-gradient(180deg, ${band.from}, ${band.to})` : "none",
                      backgroundColor: b.count ? undefined : "#e3e1db",
                      boxShadow: b.count ? "0 1px 2px rgba(36,35,31,0.14), inset 0 1px 0 rgba(255,255,255,0.45)" : "none",
                    } as React.CSSProperties}
                  />
                </div>
              );
            })}
          </div>
          {/* 刻度 */}
          <div className="mt-1.5 flex gap-1.5 border-t border-line/70 pt-1.5">
            {histogram.buckets.map((b, i) => (
              <span key={i} className="flex-1 text-center text-[10px] tabular-nums text-muted">{b.low}</span>
            ))}
          </div>
          <p className="mt-1 text-center text-[10px] text-muted">总分区间（分）</p>
        </div>
      </CardContent>
    </Card>
  );
}
