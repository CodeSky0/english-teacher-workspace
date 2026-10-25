import type { CSSProperties } from "react";

/**
 * 迷你趋势线 Sparkline
 *
 * 纯 SVG + 纯函数生成平滑路径，服务端组件也能用。
 * - 面积填充：主题色垂直渐变，底部透明
 * - 描边：同色，进入视口时用 stroke-dashoffset 动画「画」出来
 * - 末点：实心圆 + 外圈光晕
 */
function buildPath(points: number[], width: number, height: number, pad: number) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const stepX = (width - pad * 2) / Math.max(1, points.length - 1);
  const coords = points.map((p, i) => [
    pad + i * stepX,
    pad + (height - pad * 2) * (1 - (p - min) / span),
  ] as [number, number]);

  if (coords.length === 1) {
    return { line: `M${coords[0][0]},${coords[0][1]}`, area: "", last: coords[0] };
  }

  // Catmull-Rom → 三次贝塞尔，得到圆润的趋势线
  const line = coords
    .map(([x, y], i) => {
      if (i === 0) return `M${x.toFixed(2)},${y.toFixed(2)}`;
      const [x0, y0] = coords[i - 1];
      const [xp, yp] = coords[i - 2] ?? coords[i - 1];
      const [xn, yn] = coords[i + 1] ?? coords[i];
      const c1x = x0 + (x - xp) / 6;
      const c1y = y0 + (y - yp) / 6;
      const c2x = x - (xn - x0) / 6;
      const c2y = y - (yn - y0) / 6;
      return `C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const area = `${line} L${coords[coords.length - 1][0].toFixed(2)},${height} L${coords[0][0].toFixed(2)},${height} Z`;
  return { line, area, last: coords[coords.length - 1] };
}

export function Sparkline({
  data,
  width = 120,
  height = 36,
  color = "#c56473",
  showArea = true,
  showDot = true,
  strokeWidth = 1.8,
  className,
  id,
  style,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
  showDot?: boolean;
  strokeWidth?: number;
  className?: string;
  id?: string;
  style?: CSSProperties;
}) {
  if (!data || data.length === 0) return null;
  const pad = showDot ? 4 : 2;
  const { line, area, last } = buildPath(data, width, height, pad);
  const gradId = `spark-${id ?? Math.round(width)}-${color.replace("#", "")}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      style={style}
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.26" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showArea && area && <path d={area} fill={`url(#${gradId})`} />}
      <path
        d={line}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 1px 3px ${color}55)` }}
      />
      {showDot && (
        <>
          <circle cx={last[0]} cy={last[1]} r={4.5} fill={color} opacity={0.18} />
          <circle cx={last[0]} cy={last[1]} r={2.2} fill={color} />
        </>
      )}
    </svg>
  );
}
