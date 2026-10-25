"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getNavTitle } from "@/lib/navigation";
import { groupNameOf } from "./nav-meta";
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
  const groupName = groupNameOf(title) ?? "工作台";
  const { toggleSidebar, saveStatus } = useWorkspace();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
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

  // 点击空白处收起用户菜单（保持原有的点击展开行为）
  useEffect(() => {
    if (!userMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [userMenuOpen]);

  const statusText = {
    idle: "",
    saving: "正在保存…",
    saved: "已保存",
    error: "保存失败，点击重试",
  }[saveStatus];

  return (
    <header className="glass-nav relative sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 px-4">
      {/* 顶部高光边 */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.95),transparent)]" />

      <button
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/60 bg-white/50 text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-colors duration-[var(--dur-quick)] hover:bg-white/80 hover:text-text lg:hidden"
        onClick={toggleSidebar}
        aria-label="打开侧边栏"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* 面包屑：页面唯一 H1 交给 PageHeader，顶栏只做层级导航 */}
      <nav aria-label="面包屑" className="flex min-w-0 items-center gap-2 text-[12px] leading-none">
        <span className="shrink-0 text-muted">{groupName}</span>
        <span className="shrink-0 text-neutral-4" aria-hidden="true">
          /
        </span>
        <span className="truncate font-medium text-text">{title}</span>
      </nav>

      <div className="ml-1 hidden sm:block">
        <ClassSelector />
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        {/* 搜索：⌘K 视觉 + 聚焦光晕（仅视觉，未实现搜索路由） */}
        <div className="group relative hidden items-center md:flex">
          <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-neutral-5 transition-colors duration-[var(--dur-quick)] group-focus-within:text-primary" />
          <Input
            placeholder="搜索工作台…"
            aria-label="搜索"
            className="h-10 w-52 rounded-full border-line/70 bg-white/70 pl-8 pr-14 text-[13px] shadow-[inset_0_1px_2px_rgba(36,35,31,0.04)] transition-shadow duration-[var(--dur-quick)] group-focus-within:shadow-[inset_0_1px_2px_rgba(36,35,31,0.03),0_0_0_4px_rgba(197,100,115,0.10)]"
          />
          <kbd className="pointer-events-none absolute right-2 hidden items-center gap-0.5 rounded-md border border-line/80 bg-white/75 px-1.5 py-0.5 text-[10px] font-medium text-neutral-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] lg:flex">
            ⌘K
          </kbd>
        </div>

        {/* 保存状态胶囊 */}
        {saveStatus !== "idle" && (
          <span
            className={cn(
              "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] sm:inline-flex",
              saveStatus === "error"
                ? "border-[#a64953]/25 bg-[#f3dadb]/85 text-[#a64953]"
                : saveStatus === "saving"
                  ? "border-[#a87a3d]/25 bg-[#f7efe2]/85 text-[#8a6230]"
                  : "border-[#5e9f7e]/25 bg-[#eaf4ee]/85 text-[#3d7a5e]",
              "transition-opacity duration-[var(--dur-quick)]"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                saveStatus === "error"
                  ? "bg-[#a64953]"
                  : saveStatus === "saving"
                    ? "animate-breathe bg-[#a87a3d]"
                    : "bg-[#5e9f7e] shadow-[0_0_6px_rgba(94,159,126,0.7)]"
              )}
            />
            {statusText}
          </span>
        )}

        <Button
          variant="outline"
          onClick={() => router.push("/classroom")}
          className="gap-1.5"
        >
          <Monitor className="h-4 w-4" />
          <span className="hidden sm:inline">课堂互动</span>
          <kbd className="hidden rounded border border-line/80 bg-neutral-3/60 px-1.5 py-0.5 text-caption-10 font-medium text-neutral-6 lg:inline">
            C
          </kbd>
        </Button>

        {/* 头像：渐变光环 + 下拉菜单 */}
        <div className="relative" ref={menuRef}>
          <button
            className={cn(
              "group flex h-10 items-center gap-1.5 rounded-full p-0.5 pr-1.5",
              "ring-1 ring-inset ring-white/70 transition-[box-shadow,transform] duration-[var(--dur-smooth)] ease-[var(--ease-smooth)]",
              "hover:shadow-[0_0_0_3px_rgba(197,100,115,0.12),0_8px_20px_-10px_rgba(58,42,45,0.55)]",
              userMenuOpen && "shadow-[0_0_0_3px_rgba(197,100,115,0.14),0_8px_20px_-10px_rgba(58,42,45,0.55)]"
            )}
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            aria-label="账户菜单"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[conic-gradient(from_140deg,#e9a0ad,#a9c6de,#a8d5bd,#e9c28f,#e9a0ad)] p-[2px] shadow-[0_0_14px_-2px_rgba(197,100,115,0.55)] transition-transform duration-[var(--dur-smooth)] ease-[var(--ease-spring)] group-hover:scale-105">
              <span className="flex h-full w-full items-center justify-center rounded-full bg-[linear-gradient(145deg,#d97787,#a64953)] text-[13px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                {userName?.[0]?.toUpperCase() || "T"}
              </span>
            </span>
            <ChevronDown
              className={cn(
                "hidden h-3.5 w-3.5 text-neutral-5 transition-transform duration-[var(--dur-quick)] sm:block",
                userMenuOpen && "rotate-180"
              )}
            />
          </button>

          {userMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-11 w-56 origin-top-right animate-scale-in overflow-hidden rounded-2xl border border-white/75 bg-[rgba(255,255,255,0.94)] py-1.5 shadow-paper-lg inner-lit"
            >
              <div className="flex items-center gap-2.5 border-b border-line/70 px-3 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(145deg,#d97787,#a64953)] text-xs font-medium text-white">
                  {userName?.[0]?.toUpperCase() || "T"}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">{userName || "教师"}</p>
                  <p className="eyebrow mt-0.5 text-[9px] text-neutral-5">Teacher Account</p>
                </div>
              </div>
              <button
                role="menuitem"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-text transition-colors duration-[var(--dur-quick)] hover:bg-[#f8e4e7]/60"
                onClick={() => {
                  setUserMenuOpen(false);
                  router.push("/dashboard/settings");
                }}
              >
                <UserIcon className="h-4 w-4 text-neutral-5" />
                个人设置
              </button>
              <button
                role="menuitem"
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