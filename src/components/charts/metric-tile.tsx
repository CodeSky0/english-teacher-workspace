import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/common/count-up";
import { ProgressRing } from "@/components/charts/progress-ring";
import { Sparkline } from "@/components/charts/sparkline";

/**
 * 数据看板 KPI 砖块（纯展示 + 客户端数字滚动）
 *
 * - 与总览页 StatsCard 同一视觉语言：釉面渐变底、径向光晕、底部色条
 * - 大号数字用 font-display / num-glaze 金属釉光
 * - 支持三种右侧装饰：迷你趋势 Sparkline / 环形进度 ProgressRing / 英文小标
 */
const TONES = {
  ume: {
    color: "#b8556a",
    spark: "#c56473",
    tile: "linear-gradient(160deg,#faeef0,#f3dde1)",
    glow: "rgba(197,100,115,0.24)",
  },
  hanada: {
    color: "#3d6896",
    spark: "#3d6896",
    tile: "linear-gradient(160deg,#e9f1f8,#d5e3f0)",
    glow: "rgba(61,104,150,0.22)",
  },
  wakatake: {
    color: "#3d7a5e",
    spark: "#5e9f7e",
    tile: "linear-gradient(160deg,#eaf4ee,#d9eadd)",
    glow: "rgba(94,159,126,0.22)",
  },
  kuchiba: {
    color: "#8a6230",
    spark: "#a87a3d",
    tile: "linear-gradient(160deg,#f7efe2,#efe2cd)",
    glow: "rgba(168,122,61,0.22)",
  },
  sumi: {
    color: "#5c5a55",
    spark: "#787670",
    tile: "linear-gradient(160deg,#f2f1ed,#e7e5df)",
    glow: "rgba(120,118,112,0.20)",
  },
  exam: {
    color: "#a64953",
    spark: "#a64953",
    tile: "linear-gradient(160deg,#f7e3e4,#f0d3d5)",
    glow: "rgba(166,73,83,0.22)",
  },
} as const;

export type MetricTone = keyof typeof TONES;

type MetricShellProps = {
  label: string;
  hint?: string;
  icon: LucideIcon;
  tone?: MetricTone;
  index?: number;
  className?: string;
  children: React.ReactNode;
};

/** KPI 砖块外壳：渐变底 + 角落光晕 + 底部色条 + 可选错峰入场 */
function MetricShell({ label, hint, icon: Icon, tone = "ume", index, className, children }: MetricShellProps) {
  const t = TONES[tone];
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-white/70 p-4",
        "bg-[linear-gradient(165deg,#ffffff_0%,#fdfcfa_52%,#f7f5f1_100%)]",
        "shadow-[0_1px_2px_rgba(36,35,31,0.05),inset_0_1px_0_rgba(255,255,255,0.95)]",
        "transition-[transform,box-shadow,border-color] duration-[var(--dur-smooth)] ease-[var(--ease-smooth)]",
        "hover:-translate-y-[3px] hover:border-primary/20 hover:shadow-paper-md",
        index != null && "animate-fade-in-up",
        className
      )}
      style={index != null ? ({ animationDelay: `${index * 55}ms` } as CSSProperties) : undefined}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-50 blur-2xl transition-opacity duration-[var(--dur-slow)] group-hover:opacity-100"
        style={{ background: `radial-gradient(circle, ${t.glow}, transparent 70%)` }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[2px] opacity-40 transition-opacity duration-[var(--dur-smooth)] group-hover:opacity-90"
        style={{ backgroundImage: `linear-gradient(90deg, ${t.color}cc, ${t.color}00)` }}
      />
      <div className="relative flex items-start justify-between gap-2">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.65rem] shadow-[0_4px_10px_-3px_rgba(36,35,31,0.30),inset_0_1px_0_rgba(255,255,255,0.55)] transition-transform duration-[var(--dur-smooth)] ease-[var(--ease-spring)] group-hover:scale-[1.08]"
          style={{ backgroundImage: t.tile, color: t.color }}
        >
          <Icon className="h-[17px] w-[17px]" />
        </span>
        {hint && <span className="eyebrow pt-1.5 text-neutral-6">{hint}</span>}
      </div>
      <div className="relative mt-3">{children}</div>
      <p className="relative mt-1 flex items-center justify-between gap-2 text-xs text-muted">
        <span className="truncate">{label}</span>
      </p>
    </div>
  );
}

/** 标准 KPI 砖：大号数字 + 可选迷你趋势 */
export function MetricTile({
  label,
  hint,
  value,
  decimals = 0,
  suffix,
  icon,
  tone = "ume",
  spark,
  sparkWidth = 76,
  index,
  className,
}: {
  label: string;
  hint?: string;
  value: number | null;
  decimals?: number;
  suffix?: string;
  icon: LucideIcon;
  tone?: MetricTone;
  spark?: number[];
  sparkWidth?: number;
  index?: number;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <MetricShell label={label} hint={hint} icon={icon} tone={tone} index={index} className={className}>
      <div className="flex items-end justify-between gap-2">
        <p className="flex items-baseline gap-1">
          {value == null ? (
            <span className="num-display text-[30px] font-semibold leading-none text-text/30 sm:text-[32px]">—</span>
          ) : (
            <CountUp value={value} decimals={decimals} className="num-display text-[30px] font-semibold leading-none text-text sm:text-[32px]" />
          )}
          {value != null && suffix && <span className="text-[11px] font-medium text-muted">{suffix}</span>}
        </p>
        {spark && spark.length > 1 && (
          <Sparkline
            data={spark}
            width={sparkWidth}
            height={30}
            color={t.spark}
            showDot={false}
            className="shrink-0 opacity-80 transition-opacity duration-[var(--dur-smooth)] group-hover:opacity-100"
          />
        )}
      </div>
    </MetricShell>
  );
}

/** 环形 KPI 砖：大号数字 + 渐变进度环（环心放图标） */
export function MetricRing({
  label,
  hint,
  value,
  icon,
  tone = "wakatake",
  from,
  to,
  suffix = "%",
  decimals = 0,
  index,
  className,
}: {
  label: string;
  hint?: string;
  value: number | null;
  icon: LucideIcon;
  tone?: MetricTone;
  from?: string;
  to?: string;
  suffix?: string;
  decimals?: number;
  index?: number;
  className?: string;
}) {
  const t = TONES[tone];
  const Icon = icon;
  return (
    <MetricShell label={label} hint={hint} icon={icon} tone={tone} index={index} className={className}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-baseline gap-1">
          {value == null ? (
            <span className="num-display text-[30px] font-semibold leading-none text-text/30 sm:text-[32px]">—</span>
          ) : (
            <CountUp value={value} decimals={decimals} className="num-display text-[30px] font-semibold leading-none text-text sm:text-[32px]" />
          )}
          {value != null && suffix && <span className="text-[11px] font-medium text-muted">{suffix}</span>}
        </p>
        <ProgressRing
          value={value ?? 0}
          size={44}
          strokeWidth={5}
          from={from ?? "#7fc0a0"}
          to={to ?? "#3d7a5e"}
        >
          <Icon className="h-3.5 w-3.5" style={{ color: t.color }} />
        </ProgressRing>
      </div>
    </MetricShell>
  );
}
