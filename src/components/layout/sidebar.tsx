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
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-200 lg:static lg:z-auto",
          sidebarCollapsed ? "w-16" : "w-60",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ background: "var(--side-bg)" }}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <span className={cn("text-lg font-bold text-white", sidebarCollapsed && "hidden")}>
            英语教师工作台
          </span>
          <button
            className="text-white/70 hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2">
          {navGroups.map((group) => (
            <div key={group.group} className="mb-4">
              {!sidebarCollapsed && (
                <p className="mb-1 px-3 text-xs font-medium uppercase tracking-wider text-white/40">
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
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-white/10 font-medium text-white"
                        : "text-white/60 hover:bg-white/5 hover:text-white",
                      sidebarCollapsed && "justify-center px-2"
                    )}
                    style={active ? { borderLeft: `3px solid var(--side-active)` } : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!sidebarCollapsed && <span>{item.label}</span>}
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
