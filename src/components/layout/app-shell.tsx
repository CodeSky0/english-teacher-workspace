"use client";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children, userName }: { children: React.ReactNode; userName?: string }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar userName={userName} />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto w-full max-w-[1440px] p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
