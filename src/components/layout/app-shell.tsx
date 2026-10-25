"use client";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children, userName }: { children: React.ReactNode; userName?: string }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar userName={userName} />
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <main id="main-content" className="h-full overflow-y-auto scrollbar-thin">
            <div className="mx-auto w-full max-w-[1440px] px-4 pb-16 pt-5 lg:px-8 lg:pb-20 lg:pt-7">
              {children}
            </div>
          </main>
          {/* 滚动渐隐边：内容进出视口时不会生硬切断 */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-3 bg-[linear-gradient(180deg,rgba(235,231,221,0.55),transparent)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-[linear-gradient(0deg,rgba(235,231,221,0.75),transparent)]" />
        </div>
      </div>
    </div>
  );
}