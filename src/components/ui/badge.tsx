import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors duration-[var(--dur-quick)] ease-[var(--ease-smooth)]",
  {
    variants: {
      variant: {
        default: "bg-primary-l text-primary-d",
        outline: "border border-line text-text",
        muted: "bg-neutral-3/70 text-neutral-7",
        success: "bg-[#dcebe2] text-[#3d7a5e]",
        warning: "bg-[#f3e6d2] text-[#8a6230]",
        error: "bg-[#f3dadb] text-[#a64953]",
        info: "bg-[#dde7f0] text-[#3d6896]",
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
