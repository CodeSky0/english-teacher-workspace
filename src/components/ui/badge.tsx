import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  // 极淡渐变底 + 与文字同色的 1px 描边：比纯色块更透气、更耐看
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors duration-[var(--dur-quick)] ease-[var(--ease-smooth)]",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-b from-[#f8e4e7] to-[#f2d6da] text-primary-d ring-primary/20",
        outline: "bg-panel text-text ring-line",
        muted: "bg-gradient-to-b from-[#f2f1ed] to-[#eae8e2] text-neutral-7 ring-neutral-4/50",
        success: "bg-gradient-to-b from-[#e4f0e8] to-[#d5e8dc] text-[#3d7a5e] ring-[#5e9f7e]/25",
        warning: "bg-gradient-to-b from-[#f7ecda] to-[#f0e0c4] text-[#8a6230] ring-[#a87a3d]/25",
        error: "bg-gradient-to-b from-[#f7dfe0] to-[#f0cfd1] text-[#a64953] ring-[#a64953]/22",
        info: "bg-gradient-to-b from-[#e3ecf4] to-[#d3e0ec] text-[#3d6896] ring-[#3d6896]/22",
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
