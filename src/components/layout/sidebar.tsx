"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navGroups } from "@/lib/navigation";
import { useWorkspace } from "@/stores/workspace";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed } = useWorkspace();

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
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line/60 glass-sidebar",
          "transition-all duration-[var(--dur-smooth)] ease-[var(--ease-smooth)]",
          "lg:static lg:z-auto",
          sidebarCollapsed ? "w-16" : "w-60",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* 品牌区 */}
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-line/60 px-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#a64953] text-sm font-medium text-white shadow-glow">
            英
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
            className="ml-auto shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-neutral-6 transition-colors duration-[var(--dur-quick)] hover:bg-neutral-3/60 hover:text-neutral-9 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="关闭侧边栏"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="scrollbar-thin flex-1 overflow-y-auto px-2.5 py-4">
          {navGroups.map((group) => (
            <div key={group.group} className="mb-5">
              {!sidebarCollapsed && (
                <p className="mb-1.5 px-3 text-label-12 font-medium uppercase tracking-wider text-neutral-5">
                  {group.group}
                </p>
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
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                      "transition-all duration-[var(--dur-quick)] ease-[var(--ease-smooth)]",
                      active
                        ? "bg-primary-l/70 font-medium text-primary-d shadow-paper-xs"
                        : "text-neutral-7 hover:bg-neutral-3/50 hover:text-neutral-9",
                      sidebarCollapsed && "justify-center px-2"
                    )}
                  >
                    {/* 激活态左侧梅色指示条 */}
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary" />
                    )}
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform duration-[var(--dur-quick)] ease-[var(--ease-spring)]",
                        active ? "text-primary" : "group-hover:scale-110"
                      )}
                    />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        {/* 底部淡墨分隔线 */}
        {!sidebarCollapsed && (
          <div className="px-4 pb-4">
            <div className="divider-ink" />
            <p className="mt-3 text-center text-caption-10 text-neutral-5">
              v1.01-preview
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
