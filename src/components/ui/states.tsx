import * as React from "react";
import { cn } from "@/lib/utils";
import { RotateCcw } from "lucide-react";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-14 text-center animate-fade-in-up", className)}>
      {icon && (
        <div className="relative mb-4">
          {/* 双层光环 + 淡网格底，替代单调的灰色方块 */}
          <div className="absolute inset-0 -m-3 rounded-full bg-primary/[0.055] blur-lg animate-breathe" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-line/70 bg-[linear-gradient(165deg,#ffffff,#f4f2ed)] text-neutral-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_6px_16px_-10px_rgba(36,35,31,0.5)]">
            <div className="absolute inset-1.5 rounded-xl grid-veil opacity-60" />
            <span className="relative">{icon}</span>
          </div>
        </div>
      )}
      <p className="text-sm font-medium text-text">{title}</p>
      {description && <p className="mt-1.5 max-w-xs text-xs text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingState({ text = "加载中…" }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14">
      <div className="relative h-9 w-9">
        {/* 轨道 */}
        <div className="absolute inset-0 rounded-full border-2 border-neutral-3/70" />
        {/* 跑动弧线：梅色 → 縹蓝渐变，比单色更精致 */}
        <svg className="absolute inset-0 h-9 w-9 animate-spin" viewBox="0 0 36 36" fill="none">
          <defs>
            <linearGradient id="spin-ume" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
              <stop stopColor="#c56473" />
              <stop offset="1" stopColor="#3d6896" />
            </linearGradient>
          </defs>
          <circle cx="18" cy="18" r="16" stroke="url(#spin-ume)" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="74 100" />
        </svg>
        <span className="absolute inset-0 -z-10 rounded-full bg-primary/20 blur-md" />
      </div>
      <span className="text-sm text-muted">{text}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center animate-fade-in-up">
      <div className="relative mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-b from-[#f7dfe0] to-[#f0cfd1] text-[#a64953] ring-1 ring-inset ring-[#a64953]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <p className="text-sm text-[#a64953]">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-line bg-gradient-to-b from-white to-[#faf9f7] px-3 py-1.5 text-sm text-primary-d shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-[var(--dur-quick)] hover:-translate-y-[1px] hover:border-primary/40 hover:shadow-paper-sm"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          重试
        </button>
      )}
    </div>
  );
}
