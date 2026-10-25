"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { navGroups } from "@/lib/navigation";
import { useWorkspace } from "@/stores/workspace";
import { cn } from "@/lib/utils";
import { groupEnglish } from "./nav-meta";
import { X, PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react";

/** 页脚功能标签：只做导航辅助，不使用任何编造的数据 */
const FLOW_TAGS = [
  { label: "词汇", dot: "#8a6230" },
  { label: "听写", dot: "#3d6896" },
  { label: "学情", dot: "#4a8f74" },
  { label: "课堂", dot: "#c56473" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed } = useWorkspace();
  const navRef = useRef<HTMLElement>(null);

  // 深层路由（设置 / 帮助 / AI 等）把激活项滚进可视区，保证当前位置一眼可见
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
    if (!active) return;
    const navRect = nav.getBoundingClientRect();
    const rect = active.getBoundingClientRect();
    if (rect.top < navRect.top || rect.bottom > navRect.bottom) {
      nav.scrollTop += rect.top - navRect.top - 24;
    }
  }, [pathname]);

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 animate-fade-in bg-[rgba(36,35,31,0.32)] backdrop-blur-[2px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "glass-sidebar fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden",
          "border-r border-line/70 shadow-[inset_-1px_0_0_rgba(255,255,255,0.6),10px_0_30px_-24px_rgba(58,42,45,0.55)]",
          "transition-[width,transform] duration-[var(--dur-smooth)] ease-[var(--ease-smooth)]",
          "lg:static lg:z-auto",
          sidebarCollapsed ? "w-[4.75rem]" : "w-64",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* 顶部高光：玻璃边缘受光 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[3] h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.95),transparent)]" />
        {/* 极光薄雾：梅（左上）+ 縹（右下） */}
        <div className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(197,100,115,0.14),transparent_70%)]" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(61,104,150,0.10),transparent_72%)]" />
        {/* 稿纸网格 */}
        <div className="pointer-events-none absolute inset-0 grid-veil opacity-60" />

        {/* 品牌区 */}
        <div
          className={cn(
            "relative z-10 flex h-[4.5rem] shrink-0 items-center gap-3 border-b border-line/60",
            sidebarCollapsed ? "justify-center px-2" : "px-4"
          )}
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] bg-[linear-gradient(145deg,#d97787_0%,#c56473_46%,#a64953_100%)] shadow-[0_4px_12px_-3px_rgba(168,84,99,0.55),inset_0_1px_0_rgba(255,255,255,0.45)] ring-1 ring-white/40">
            <span className="pointer-events-none absolute inset-0 rounded-[0.9rem] bg-[radial-gradient(circle_at_30%_16%,rgba(255,255,255,0.65),transparent_58%)] opacity-70" />
            <span className="relative font-serif text-[15px] font-medium text-white">英</span>
            <span className="pointer-events-none absolute inset-[3px] rounded-[0.7rem] border border-white/25" />
          </span>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="truncate font-serif text-[15px] tracking-wide text-neutral-9">英语教师工作台</p>
              <p className="eyebrow mt-0.5 hidden text-[9px] text-neutral-5 lg:block">Yohaku Workspace</p>
            </div>
          )}
          <button
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-neutral-6 transition-colors duration-[var(--dur-quick)] hover:bg-neutral-3/60 hover:text-neutral-9",
              sidebarCollapsed ? "absolute right-1 top-1.5 lg:hidden" : "ml-auto lg:hidden"
            )}
            onClick={() => setSidebarOpen(false)}
            aria-label="关闭侧边栏"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 导航：独立滚动容器 + 底部渐隐 */}
        <div className="relative z-10 min-h-0 flex-1">
          <nav
            ref={navRef}
            aria-label="主导航"
            className="scrollbar-thin h-full overflow-y-auto px-2.5 pb-10 pt-3"
          >
            {navGroups.map((group, gi) => (
              <div key={group.group} className={cn("mb-5", gi === 0 && "mt-0")}>
                {!sidebarCollapsed ? (
                  <div className="mb-2 flex items-center gap-2 px-2.5">
                    <span className="eyebrow text-[9px] text-neutral-5">{groupEnglish(group.group)}</span>
                    <span className="text-[10px] tracking-wide text-neutral-5/85">{group.group}</span>
                    <span className="ml-1 h-px flex-1 bg-[linear-gradient(90deg,rgba(227,225,219,0.9),rgba(227,225,219,0.25),transparent)]" />
                  </div>
                ) : (
                  <div className="mx-auto mb-2.5 flex h-3 items-center justify-center">
                    <span className="h-px w-5 bg-[linear-gradient(90deg,transparent,var(--line),transparent)]" />
                  </div>
                )}

                {group.items.map((item) => {
                  const active = pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      title={sidebarCollapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "spotlight group relative mb-0.5 flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm",
                        "transition-[background,box-shadow,color,transform] duration-[var(--dur-smooth)] ease-[var(--ease-smooth)]",
                        active
                          ? "bg-[linear-gradient(96deg,rgba(248,228,231,0.98)_0%,rgba(247,223,228,0.92)_55%,rgba(244,219,224,0.55)_100%)] font-medium text-primary-d shadow-[0_6px_16px_-10px_rgba(197,100,115,0.85),inset_0_1px_0_rgba(255,255,255,0.95),inset_0_0_0_1px_rgba(197,100,115,0.16)]"
                          : "text-neutral-7 hover:translate-x-[1px] hover:bg-white/50 hover:text-neutral-9",
                        sidebarCollapsed && "justify-center px-2"
                      )}
                    >
                      {/* 激活指示条：带柔光 */}
                      {active && (
                        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[linear-gradient(180deg,#e29aa6,#b8556a)] shadow-[0_0_12px_rgba(197,100,115,0.7)]" />
                      )}
                      {/* 图标槽：激活时渐变发光，未激活时白玻璃 */}
                      <span
                        className={cn(
                          "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                          "transition-[background-color,box-shadow,color,transform] duration-[var(--dur-smooth)] ease-[var(--ease-spring)]",
                          active
                            ? "scale-105 bg-[linear-gradient(145deg,#d97787_0%,#c56473_55%,#a85463_100%)] text-white shadow-[0_0_16px_-2px_rgba(197,100,115,0.6),inset_0_1px_0_rgba(255,255,255,0.38)]"
                            : "bg-white/55 text-neutral-6 ring-1 ring-inset ring-line/60 group-hover:scale-105 group-hover:bg-white/85 group-hover:text-neutral-8 group-hover:ring-white"
                        )}
                      >
                        <Icon className="h-[15px] w-[15px]" />
                      </span>
                      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                      {!sidebarCollapsed && active && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary/70 shadow-[0_0_8px_rgba(197,100,115,0.8)]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          {/* 底部渐隐：滚动内容柔和收进页脚 */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-[linear-gradient(0deg,rgba(240,236,227,0.96),rgba(240,236,227,0))]" />
        </div>

        {/* 页脚：功能标签 + 版本 + 折叠 */}
        <div className="relative z-20 shrink-0 border-t border-line/60 bg-[linear-gradient(180deg,rgba(250,248,243,0.72),rgba(236,231,221,0.95))] px-3 pb-3 pt-3">
          {sidebarCollapsed ? (
            <div className="mb-2 flex flex-col items-center gap-2 rounded-xl border border-white/70 bg-white/60 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <Sparkles className="h-3.5 w-3.5 text-primary/70" />
              <span className="flex gap-1">
                {FLOW_TAGS.map((t) => (
                  <span key={t.label} className="h-1 w-1 rounded-full" style={{ backgroundColor: t.dot }} />
                ))}
              </span>
            </div>
          ) : (
            <div className="mb-2.5 rounded-xl border border-white/75 bg-[linear-gradient(165deg,rgba(255,255,255,0.92),rgba(249,247,242,0.66))] px-3 py-2.5 shadow-[0_2px_10px_-8px_rgba(58,42,45,0.55),inset_0_1px_0_rgba(255,255,255,0.95)]">
              <p className="eyebrow text-[9px] text-neutral-5">Teaching Flow</p>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {FLOW_TAGS.map((t) => (
                  <span
                    key={t.label}
                    className="flex items-center gap-1.5 rounded-md bg-white/65 px-1.5 py-1 text-[10px] text-neutral-7 ring-1 ring-inset ring-line/50"
                  >
                    <span className="h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: t.dot }} />
                    {t.label}
                  </span>
                ))}
              </div>
            </div>
          )}
          {!sidebarCollapsed && (
            <p className="mb-2 text-center text-[10px] tracking-[0.18em] text-neutral-5">V2.0 · YOHAKU</p>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              "hidden min-h-10 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-neutral-6 lg:flex",
              "transition-colors duration-[var(--dur-quick)] hover:bg-white/60 hover:text-neutral-9",
              sidebarCollapsed && "justify-center px-2"
            )}
            aria-label={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span>收起侧边栏</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}