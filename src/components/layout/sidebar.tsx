"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navGroups } from "@/lib/navigation";
import { useWorkspace } from "@/stores/workspace";
import { cn } from "@/lib/utils";
import { X, PanelLeftClose, PanelLeftOpen } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed } = useWorkspace();

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-neutral-10/40 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line/70 glass-sidebar",
          "transition-[width,transform] duration-[var(--dur-smooth)] ease-[var(--ease-smooth)]",
          "lg:static lg:z-auto",
          sidebarCollapsed ? "w-[4.5rem]" : "w-60",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* 淡网格纹理层，营造「稿纸」质感 */}
        <div className="pointer-events-none absolute inset-0 grid-veil opacity-70" />

        {/* 品牌区 */}
        <div className="relative flex h-16 shrink-0 items-center gap-2.5 border-b border-line/70 px-4">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#cd6c7a] to-[#a64953] text-sm font-medium text-white shadow-[0_2px_6px_-1px_rgba(168,84,99,0.5),inset_0_1px_0_rgba(255,255,255,0.35)]">
            英
            {/* 品牌角标：极淡的内圈，像朱印的边框 */}
            <span className="absolute inset-[3px] rounded-[0.55rem] border border-white/25" />
          </span>
          <span
            className={cn(
              "truncate font-serif text-[15px] font-medium tracking-wide text-neutral-9",
              sidebarCollapsed && "hidden"
            )}
          >
            英语教师工作台
          </span>
          <button
            className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-neutral-6 transition-colors duration-[var(--dur-quick)] hover:bg-neutral-3/60 hover:text-neutral-9 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="关闭侧边栏"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="scrollbar-thin relative flex-1 overflow-y-auto px-2.5 py-4">
          {navGroups.map((group, gi) => (
            <div key={group.group} className={cn("mb-5", gi === 0 && "mt-0")}>
              {!sidebarCollapsed ? (
                <div className="mb-2 flex items-center gap-2 px-3">
                  <span className="h-1 w-1 rounded-full bg-primary/60" />
                  <p className="text-label-12 font-medium uppercase tracking-wider text-neutral-5">
                    {group.group}
                  </p>
                  <span className="ml-auto h-px flex-1 bg-gradient-to-r from-line to-transparent" />
                </div>
              ) : (
                <div className="mx-auto mb-3 h-px w-6 bg-line" />
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
                    className={cn(
                      "group relative mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                      "transition-all duration-[var(--dur-quick)] ease-[var(--ease-smooth)]",
                      active
                        ? "bg-gradient-to-r from-[#f8e4e7] to-[#f4dbe0]/60 font-medium text-primary-d shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                        : "text-neutral-7 hover:bg-neutral-3/45 hover:text-neutral-9",
                      sidebarCollapsed && "justify-center px-2"
                    )}
                  >
                    {/* 激活态：左侧梅色指示条，带出场动画 */}
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[#cd6c7a] to-[#a64953]" />
                    )}
                    {/* 图标容器：激活时填充梅色渐变，未激活时中性底色 */}
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-[var(--dur-quick)] ease-[var(--ease-spring)]",
                        active
                          ? "bg-gradient-to-br from-[#cd6c7a] to-[#a85463] text-white shadow-[0_1px_3px_rgba(168,84,99,0.35),inset_0_1px_0_rgba(255,255,255,0.3)]"
                          : "bg-neutral-3/45 text-neutral-6 group-hover:bg-neutral-4/50 group-hover:text-neutral-8",
                        !active && "group-hover:scale-105"
                      )}
                    >
                      <Icon className="h-[15px] w-[15px]" />
                    </span>
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* 底部：版本 + 折叠切换 */}
        <div className="relative border-t border-line/70 px-3 py-3">
          {!sidebarCollapsed && (
            <p className="mb-2 text-center text-caption-10 tracking-wide text-neutral-5">
              v2.0.0 · Yohaku
            </p>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              "hidden w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-neutral-6",
              "transition-colors duration-[var(--dur-quick)] hover:bg-neutral-3/50 hover:text-neutral-9 lg:flex",
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
