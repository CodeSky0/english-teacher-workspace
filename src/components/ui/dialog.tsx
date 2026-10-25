import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, description, children, className }: DialogProps) {
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩：墨色径向渐变 + 毛玻璃，聚焦对话内容 */}
      <div
        className="absolute inset-0 animate-fade-in"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 38%, rgba(36,35,31,0.22) 0%, rgba(36,35,31,0.46) 100%)",
          backdropFilter: "blur(6px) saturate(1.1)",
          WebkitBackdropFilter: "blur(6px) saturate(1.1)",
        }}
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-lg overflow-y-auto rounded-2xl border border-white/70 bg-panel scrollbar-thin",
          "shadow-paper-float edge-lit",
          "max-h-[90vh] p-6",
          className
        )}
      >
        {/* 顶部釉面高光 + 极淡网格 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 rounded-t-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(255,255,255,0))]" />
        <div className="pointer-events-none absolute inset-0 rounded-2xl grid-veil opacity-30" />
        {title && (
          <h2 className="relative mb-1 font-serif text-xl font-semibold tracking-tight text-text">{title}</h2>
        )}
        {description && <p className="relative mb-4 text-sm text-muted">{description}</p>}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors duration-[var(--dur-quick)] hover:bg-neutral-3/60 hover:text-text"
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}
