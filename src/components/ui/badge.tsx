import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  // 极淡渐变底 + 与文字同色的 1px 描边：比纯色块更透气、更耐看
  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset transition-all duration-[var(--dur-quick)] ease-[var(--ease-smooth)] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-b from-[#f8e4e7] to-[#f2d6da] text-[#9c4a58] ring-primary/25",
        outline: "bg-panel text-text ring-line",
        muted: "bg-gradient-to-b from-[#f2f1ed] to-[#eae8e2] text-neutral-8 ring-neutral-4/50",
        success: "bg-gradient-to-b from-[#e4f0e8] to-[#d5e8dc] text-[#2f6347] ring-[#5e9f7e]/30",
        warning: "bg-gradient-to-b from-[#f7ecda] to-[#f0e0c4] text-[#7a5527] ring-[#a87a3d]/30",
        error: "bg-gradient-to-b from-[#f7dfe0] to-[#f0cfd1] text-[#8f3d46] ring-[#a64953]/25",
        info: "bg-gradient-to-b from-[#e3ecf4] to-[#d3e0ec] text-[#345c85] ring-[#3d6896]/25",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}