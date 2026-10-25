import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 区块标题 SectionHeader
 *
 * 图标槽 + 中文标题 + 英文小标 + 右侧附加信息，让每张卡片的「报头」一致。
 * 不带任何交互，纯展示。
 */
export function SectionHeader({
  icon: Icon,
  title,
  en,
  right,
  className,
  tone = "ume",
}: {
  icon?: LucideIcon;
  title: string;
  en?: string;
  right?: React.ReactNode;
  className?: string;
  tone?: "ume" | "hanada" | "wakatake" | "kuchiba" | "sumi";
}) {
  const tones: Record<string, string> = {
    ume: "linear-gradient(180deg,#f8e4e7,#f2d6da) text-primary-d ring-[#c56473]/18",
    hanada: "linear-gradient(180deg,#e9f0f6,#dee8f0) text-[#3d6896] ring-[#3d6896]/18",
    wakatake: "linear-gradient(180deg,#e4f0e8,#d5e8dc) text-[#3d7a5e] ring-[#5e9f7e]/18",
    kuchiba: "linear-gradient(180deg,#f9f1e1,#f2e7d2) text-[#8a6230] ring-[#a87a3d]/18",
    sumi: "linear-gradient(180deg,#f2f1ed,#eae8e2) text-neutral-6 ring-[#cfccc4]/50",
  };
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-line/60 px-5 py-3.5",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon && (
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-inset",
              tones[tone]
            )}
          >
            <Icon className="h-[15px] w-[15px]" />
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold leading-tight tracking-[0.01em] text-text">{title}</p>
          {en && <p className="eyebrow mt-1 leading-none">{en}</p>}
        </div>
      </div>
      {right && <div className="shrink-0 text-xs text-neutral-6">{right}</div>}
    </div>
  );
}
