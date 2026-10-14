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
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-panel px-4">
      <button
        className="text-muted hover:text-text lg:hidden"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="text-lg font-semibold text-text">{title}</h1>
      <div className="ml-2 hidden sm:block">
        <ClassSelector />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden items-center md:flex">
          <Search className="mr-1 h-4 w-4 text-muted" />
          <Input
            placeholder="搜索…"
            className="h-8 w-40 text-sm"
          />
        </div>
        {statusText && (
          <span
            className={cn(
              "hidden text-xs sm:inline",
              saveStatus === "error" ? "text-red-500" : "text-muted"
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
          <kbd className="hidden rounded bg-bg px-1 text-xs lg:inline">C</kbd>
        </Button>
        <div className="relative">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm text-white"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            {userName?.[0]?.toUpperCase() || "T"}
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 top-10 w-48 rounded-md border border-line bg-panel py-1 shadow-md">
              <div className="border-b border-line px-3 py-2">
                <p className="text-sm font-medium text-text">{userName}</p>
              </div>
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text hover:bg-bg"
                onClick={() => {
                  setUserMenuOpen(false);
                  router.push("/dashboard/settings");
                }}
              >
                <UserIcon className="h-4 w-4" />
                个人设置
              </button>
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-bg"
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
