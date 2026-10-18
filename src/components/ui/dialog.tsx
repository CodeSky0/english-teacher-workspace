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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 animate-fade-in"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(36,35,31,0.26) 0%, rgba(36,35,31,0.44) 100%)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
        }}
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-lg rounded-2xl bg-panel edge-lit",
          "shadow-paper-xl inner-lit animate-scale-in",
          "max-h-[90vh] overflow-y-auto scrollbar-thin p-6",
          className
        )}
      >
        {title && (
          <h2 className="mb-1 font-serif text-lg font-semibold text-text tracking-tight">{title}</h2>
        )}
        {description && <p className="mb-4 text-sm text-muted">{description}</p>}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors duration-[var(--dur-quick)] hover:bg-neutral-3/60 hover:text-text"
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}
