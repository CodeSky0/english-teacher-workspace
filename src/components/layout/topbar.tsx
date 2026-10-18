"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getNavTitle } from "@/lib/navigation";
import { useWorkspace } from "@/stores/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, Search, Monitor, LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { ClassSelector } from "./class-selector";

export function Topbar({ userName: userNameProp }: { userName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const title = getNavTitle(pathname);
  const { toggleSidebar, saveStatus } = useWorkspace();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userName = userNameProp ?? "";

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (e.key === "c" && !isInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        router.push("/classroom");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [router]);

  const statusText = {
    idle: "",
    saving: "正在保存…",
    saved: "已保存",
    error: "保存失败，点击重试",
  }[saveStatus];

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-16 items-center gap-3 px-4 glass",
        // 底部双线：高光 + 极淡阴影，比单一 border 更通透
        "shadow-[inset_0_-1px_0_rgba(227,225,219,0.9),0_1px_4px_-1px_rgba(36,35,31,0.05)]"
      )}
    >
      <button
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors duration-[var(--dur-quick)] hover:bg-neutral-3/60 hover:text-text lg:hidden"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* 标题：左侧梅色竖条装饰，强化当前位置 */}
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="h-4 w-[3px] shrink-0 rounded-full bg-gradient-to-b from-[#cd6c7a] to-[#a64953]" />
        <h1 className="truncate text-lg font-semibold text-text tracking-tight">{title}</h1>
      </div>

      <div className="ml-2 hidden sm:block">
        <ClassSelector />
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* 搜索：图标内嵌，聚焦时光晕 */}
        <div className="relative hidden items-center md:flex">
          <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-neutral-5" />
          <Input
            placeholder="搜索…"
            className="h-8 w-44 pl-8 text-sm"
          />
        </div>

        {statusText && (
          <span
            className={cn(
              "hidden items-center gap-1.5 text-xs sm:inline-flex transition-opacity duration-[var(--dur-quick)]",
              saveStatus === "error" ? "text-[#a64953]" : "text-muted"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                saveStatus === "error" ? "bg-[#a64953]" : "bg-[#5e9f7e]",
                saveStatus === "saving" && "animate-breathe"
              )}
            />
            {statusText}
          </span>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/classroom")}
          className="gap-1.5"
        >
          <Monitor className="h-4 w-4" />
          <span className="hidden sm:inline">课堂互动</span>
          <kbd className="hidden rounded border border-line/80 bg-neutral-3/60 px-1.5 py-0.5 text-caption-10 font-medium text-neutral-6 lg:inline">
            C
          </kbd>
        </Button>

        <div className="relative">
          <button
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-full p-0.5 pr-1.5",
              "ring-1 ring-inset ring-line/80 transition-all duration-[var(--dur-quick)] hover:ring-primary/40"
            )}
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#cd6c7a] to-[#a64953] text-sm font-medium text-white shadow-[0_1px_3px_rgba(168,84,99,0.35),inset_0_1px_0_rgba(255,255,255,0.35)]">
              {userName?.[0]?.toUpperCase() || "T"}
            </span>
            <ChevronDown
              className={cn(
                "hidden h-3.5 w-3.5 text-neutral-5 transition-transform duration-[var(--dur-quick)] sm:block",
                userMenuOpen && "rotate-180"
              )}
            />
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 top-11 w-52 rounded-xl border border-line/70 bg-panel py-1.5 shadow-paper-lg inner-lit animate-scale-in origin-top-right">
              <div className="border-b border-line/70 px-3 py-2.5">
                <p className="text-sm font-medium text-text">{userName}</p>
                <p className="mt-0.5 text-caption-10 text-neutral-5">教师账户</p>
              </div>
              <button
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-text transition-colors duration-[var(--dur-quick)] hover:bg-neutral-3/50"
                onClick={() => {
                  setUserMenuOpen(false);
                  router.push("/dashboard/settings");
                }}
              >
                <UserIcon className="h-4 w-4 text-neutral-5" />
                个人设置
              </button>
              <button
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-[#a64953] transition-colors duration-[var(--dur-quick)] hover:bg-[#f3dadb]/50"
                onClick={async () => {
                  await authClient.signOut();
                  router.push("/login");
                }}
              >
                <LogOut className="h-4 w-4" />
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
