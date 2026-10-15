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
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* Yohaku：n-2 承载表面（surface），ring-border 承载分隔（division）。
          侧边栏用 neutral-2 羊皮纸面 + 右侧 --line 细线，与白色卡片形成层次。 */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line bg-neutral-2 transition-all duration-200 lg:static lg:z-auto",
          sidebarCollapsed ? "w-16" : "w-60",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* 品牌区：accent 只占 ≤5% 表面，仅用于这一个标记 */}
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-line px-4">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary text-xs font-medium text-white">
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
            className="ml-auto shrink-0 text-neutral-6 transition-colors hover:text-neutral-9 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="关闭侧边栏"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="scrollbar-thin flex-1 overflow-y-auto px-2 py-3">
          {navGroups.map((group) => (
            <div key={group.group} className="mb-4">
              {!sidebarCollapsed && (
                <p className="mb-1 px-3 text-label-12 font-medium uppercase tracking-wider text-neutral-6">
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
                      "flex items-center gap-3 rounded-md border-l-[3px] border-transparent px-3 py-2 text-sm transition-colors",
                      active
                        ? // 激活：淡梅底 + 深梅字 + accent 左标（CJK 不用合成加粗）
                          "border-primary bg-primary-l font-medium text-primary-d"
                        : "text-neutral-7 hover:bg-neutral-3/70 hover:text-neutral-9",
                      sidebarCollapsed && "justify-center px-2"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
