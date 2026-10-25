"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp } from "lucide-react";
import { CountUp } from "@/components/common/count-up";

/** 分数段：和色映射 + 中文标签 */
const BANDS = [
  { label: "待提升", min: 0, max: 59, color: "#a64953", from: "#cf8b93", to: "#a64953" },
  { label: "及格", min: 60, max: 74, color: "#a87a3d", from: "#d8b57e", to: "#a87a3d" },
  { label: "良好", min: 75, max: 89, color: "#3d6896", from: "#8db4d6", to: "#3d6896" },
  { label: "优秀", min: 90, max: 100, color: "#5e9f7e", from: "#9ccbb2", to: "#4a8f74" },
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
  const excellentRate = totals.length ? (totals.filter((t) => t >= 90).length / totals.length) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow text-neutral-6">Score Distribution</p>
            <CardTitle className="mt-1.5 flex items-center gap-2 text-[15px]">
              <span className="icon-slot">
                <BarChart3 />
              </span>
              分数分布
            </CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-baseline gap-1.5 rounded-full border border-white/70 bg-[linear-gradient(160deg,#fff6f6,#fbecee)] px-2.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
              <span className="eyebrow text-[9px] text-primary/70">AVG</span>
              <CountUp value={avg} decimals={1} className="num-display text-[15px] font-semibold leading-none text-text" />
            </span>
            <span className="inline-flex items-baseline gap-1.5 rounded-full border border-white/70 bg-[linear-gradient(160deg,#f2f9f5,#e6f2ea)] px-2.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
              <span className="eyebrow text-[9px] text-[#4a8f74]/80">PASS</span>
              <CountUp value={passRate} suffix="%" className="num-display text-[15px] font-semibold leading-none text-[#3d7a5e]" />
            </span>
            <span className="inline-flex items-baseline gap-1.5 rounded-full border border-white/70 bg-[linear-gradient(160deg,#f1f6fb,#e6eff8)] px-2.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
              <span className="eyebrow text-[9px] text-[#3d6896]/80">TOP</span>
              <CountUp value={excellentRate} suffix="%" className="num-display text-[15px] font-semibold leading-none text-[#3d6896]" />
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* 分段占比条：渐变分段 + 悬浮高亮 */}
        <div className="mb-1 flex h-2.5 w-full overflow-hidden rounded-full bg-neutral-2 shadow-[inset_0_1px_2px_rgba(36,35,31,0.07)]">
          {bands.filter((b) => b.count > 0).map((b) => (
            <div
              key={b.label}
              title={`${b.label} ${b.count} 人`}
              className="h-full transition-[width,filter] duration-[var(--dur-slow)] ease-[var(--ease-smooth)] first:rounded-l-full last:rounded-r-full hover:brightness-110"
              style={{ width: `${b.pct}%`, backgroundImage: `linear-gradient(90deg, ${b.from}, ${b.to})` }}
            />
          ))}
        </div>
        <div className="mb-4 mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
          {bands.map((b) => (
            <div key={b.label} className="group/legend flex items-center gap-1.5 text-xs">
              <span
                className="h-2 w-2 rounded-full transition-transform duration-[var(--dur-quick)] group-hover/legend:scale-125"
                style={{ backgroundColor: b.color, boxShadow: `0 0 6px ${b.color}66` }}
              />
              <span className="text-neutral-7">{b.label}</span>
              <span className="tabular-nums text-muted">{b.count}人 · {b.pct.toFixed(0)}%</span>
            </div>
          ))}
        </div>

        {/* 直方图：渐变柱 + 均分标记线 + hover 高亮 */}
        <div className="rounded-xl border border-line/60 bg-gradient-to-b from-white to-[#fcfbf9] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          <div className="relative">
            <div className="flex h-[152px] items-end gap-1.5">
              {histogram.buckets.map((b, i) => {
                const band = bandOf(b.low + 5);
                const h = b.count === 0 ? 3 : Math.max(7, (b.count / histogram.peak) * 100);
                return (
                  <div key={i} className="group/bar relative flex h-full flex-1 flex-col justify-end">
                    {/* 悬浮计数 */}
                    <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/80 bg-[rgba(255,255,255,0.9)] px-1.5 py-0.5 text-[10px] tabular-nums text-neutral-7 opacity-0 shadow-[0_10px_20px_-10px_rgba(58,42,45,0.4),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-md transition-opacity duration-[var(--dur-quick)] group-hover/bar:opacity-100">
                      {b.count} 人
                    </span>
                    <div
                      className="bar-grow w-full rounded-t-[4px] transition-[filter,box-shadow] duration-[var(--dur-quick)] group-hover/bar:brightness-110"
                      style={{
                        height: `${h}%`,
                        "--i": i,
                        backgroundImage: b.count ? `linear-gradient(180deg, ${band.from}, ${band.to})` : "none",
                        backgroundColor: b.count ? undefined : "#e3e1db",
                        boxShadow: b.count
                          ? `0 1px 2px rgba(36,35,31,0.14), inset 0 1px 0 rgba(255,255,255,0.45), 0 0 14px -4px ${band.to}66`
                          : "none",
                      } as React.CSSProperties}
                    />
                  </div>
                );
              })}
            </div>

            {/* 均分标记线 */}
            {totals.length > 0 && (
              <div
                className="pointer-events-none absolute inset-y-0 z-10"
                style={{ left: `${Math.max(0, Math.min(100, avg))}%` }}
              >
                <div className="h-full w-px bg-[linear-gradient(180deg,rgba(197,100,115,0.9),rgba(197,100,115,0.18))]" />
                <span className="absolute -top-2 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full border border-primary/25 bg-[rgba(255,255,255,0.92)] px-2 py-0.5 text-[10px] text-primary-d shadow-[0_6px_14px_-8px_rgba(168,84,99,0.6),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-sm">
                  <TrendingUp className="h-2.5 w-2.5" />
                  均分 <b className="num-display text-[11px] font-semibold tabular-nums">{avg.toFixed(1)}</b>
                </span>
                <span className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_8px_rgba(197,100,115,0.8)]" />
              </div>
            )}
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
