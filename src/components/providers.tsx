"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import { PointerGlow } from "@/components/common/pointer-glow";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            gcTime: 5 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <PointerGlow />
      {children}
      <Toaster
        position="top-center"
        offset={20}
        gap={10}
        toastOptions={{
          classNames: {
            toast:
              "!rounded-[0.625rem] !border !border-[color:var(--line)] !bg-[color:var(--panel)] !text-[color:var(--text)] " +
              "!shadow-[var(--shadow-lg)] !font-sans !text-[13px] !tracking-[0.01em] !backdrop-blur-sm",
            title: "!font-medium !text-[13px]",
            description: "!text-[12px] !text-[color:var(--muted)]",
            icon: "!shrink-0",
            success: "!border-[#5e9f7e]/35",
            error: "!border-[#a64953]/40",
            warning: "!border-[#a87a3d]/40",
            info: "!border-[#3d6896]/35",
            actionButton:
              "!rounded-md !bg-gradient-to-b !from-[#c56473] !to-[#b05564] !text-white !text-xs !font-medium " +
              "!shadow-[0_1px_2px_rgba(168,84,99,0.35)] hover:!opacity-90",
            cancelButton: "!rounded-md !bg-neutral-2 !text-neutral-7 !text-xs",
            closeButton: "!bg-neutral-2 !border-[color:var(--line)] !text-neutral-6",
          },
        }}
      />
    </QueryClientProvider>
  );
}