/**
 * 氛围层 Ambient
 *
 * 固定在视口底层的极光光斑 + 天光 + 暗角。纯 CSS 实现：
 * - 光斑用径向渐变原生柔化（不使用 filter: blur，避免每帧重新栅格化）
 * - 只动画 transform，走合成层，滚动时不重绘
 * - 全部 pointer-events: none，不会拦截交互
 */
export function Ambient() {
  return (
    <div className="ambient" aria-hidden="true">
      <span className="ambient__blob ambient__blob--1" />
      <span className="ambient__blob ambient__blob--2" />
      <span className="ambient__blob ambient__blob--3" />
      <span className="ambient__blob ambient__blob--4" />
      <div className="ambient__beam" />
      <div className="ambient__vignette" />
    </div>
  );
}
