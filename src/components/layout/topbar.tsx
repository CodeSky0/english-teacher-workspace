"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getNavTitle } from "@/lib/navigation";
import { useWorkspace } from "@/stores/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, Search, Monitor, LogOut, User as UserIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { ClassSelector } from "./class-selector";

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const title = getNavTitle(pathname);
  const { toggleSidebar, saveStatus } = useWorkspace();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    authClient.getSession().then((s) => {
      if (s?.data?.user) setUserName(s.data.user.name);
    });
  }, []);

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
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line/60 glass px-4 shadow-paper-xs">
      <button
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors duration-[var(--dur-quick)] hover:bg-neutral-3/60 hover:text-text lg:hidden"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="text-lg font-semibold text-text tracking-tight">{title}</h1>
      <div className="ml-2 hidden sm:block">
        <ClassSelector />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden items-center md:flex">
          <Search className="mr-1.5 h-4 w-4 text-neutral-5" />
          <Input
            placeholder="搜索…"
            className="h-8 w-44 text-sm"
          />
        </div>
        {statusText && (
          <span
            className={cn(
              "hidden text-xs sm:inline transition-opacity duration-[var(--dur-quick)]",
              saveStatus === "error" ? "text-[#a64953]" : "text-muted"
            )}
          >
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
          <kbd className="hidden rounded bg-neutral-3/70 px-1.5 py-0.5 text-caption-10 font-medium text-neutral-6 lg:inline">
            C
          </kbd>
        </Button>
        <div className="relative">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#a64953] text-sm font-medium text-white shadow-paper-sm transition-all duration-[var(--dur-quick)] ease-[var(--ease-spring)] hover:shadow-glow-strong hover:scale-105"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            {userName?.[0]?.toUpperCase() || "T"}
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 top-11 w-52 rounded-xl border border-line/60 bg-panel py-1.5 shadow-paper-lg animate-scale-in origin-top-right">
              <div className="border-b border-line/60 px-3 py-2.5">
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
