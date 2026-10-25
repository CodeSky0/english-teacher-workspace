"use client";

import { useEffect } from "react";

/**
 * 全局鼠标聚光追踪
 *
 * 只在 document 上挂一个 passive pointermove 监听（rAF 节流），
 * 找到指针下方的 .spotlight 元素并写入 --mx / --my 两个 CSS 变量，
 * 由 .spotlight::after 渲染柔光。相比每个卡片各挂监听，开销接近零。
 *
 * 触摸设备与「减少动态效果」用户直接跳过。
 */
export function PointerGlow() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(hover: none)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let active: HTMLElement | null = null;
    let px = 0;
    let py = 0;

    const clear = (el: HTMLElement) => {
      el.style.removeProperty("--mx");
      el.style.removeProperty("--my");
    };

    const onMove = (e: PointerEvent) => {
      const target = e.target as Element | null;
      const next = (target?.closest?.(".spotlight") as HTMLElement | null) ?? null;
      if (active && active !== next) clear(active);
      active = next;
      if (!next) return;
      px = e.clientX;
      py = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!active) return;
        const r = active.getBoundingClientRect();
        active.style.setProperty("--mx", `${px - r.left}px`);
        active.style.setProperty("--my", `${py - r.top}px`);
      });
    };

    const onLeave = () => {
      if (active) clear(active);
      active = null;
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
