/**
 * 环形进度 ProgressRing
 *
 * - 渐变色描边（梅 → 縹蓝），圆角线帽
 * - 通过 stroke-dashoffset 过渡，数值变化时平滑跟进
 * - 中间可放任意内容（数字 / 百分比 / 图标）
 */
export function ProgressRing({
  value,
  size = 64,
  strokeWidth = 6,
  from = "#c56473",
  to = "#3d6896",
  trackColor = "rgba(120,118,112,0.14)",
  id,
  children,
  className,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  from?: string;
  to?: string;
  trackColor?: string;
  id?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const safe = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - safe / 100);
  const gradId = `ring-${id ?? `${size}-${from.replace("#", "")}-${to.replace("#", "")}`}`;

  return (
    <div
      className={className}
      style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 900ms var(--ease-quick)",
            filter: `drop-shadow(0 0 4px ${from}44)`,
          }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
