import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium",
    "transition-[transform,box-shadow,border-color] duration-[var(--dur-smooth)] ease-[var(--ease-smooth)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.97]",
    // 图标与文字的呼吸感
    "[&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          // 顶部内高光 + 底部内暗边：模拟受光的实体按钮
          "bg-gradient-to-b from-[#cd6c7a] to-[#b2586a] text-white",
        outline:
          "border border-line bg-gradient-to-b from-white to-[#fdfcfa] text-text",
        ghost:
          "text-text hover:bg-neutral-3/60",
        destructive:
          "bg-gradient-to-b from-[#d1505e] to-[#a64953] text-white",
        secondary:
          "bg-gradient-to-b from-[#f7e2e5] to-[#f2d4d9] text-primary-d border border-primary/15",
        link:
          "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

/** 立体感阴影：默认 / 悬浮 / 按下三态，与 variant 无关，故单独拼装 */
const depthByVariant: Record<string, string> = {
  default:
    "shadow-[0_1px_2px_rgba(36,35,31,0.14),inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-1px_0_rgba(0,0,0,0.08)] " +
    "hover:shadow-[0_4px_12px_-2px_rgba(168,84,99,0.42),inset_0_1px_0_rgba(255,255,255,0.32),inset_0_-1px_0_rgba(0,0,0,0.10)] hover:-translate-y-[2px]",
  destructive:
    "shadow-[0_1px_2px_rgba(36,35,31,0.14),inset_0_1px_0_rgba(255,255,255,0.24),inset_0_-1px_0_rgba(0,0,0,0.10)] " +
    "hover:shadow-[0_4px_12px_-2px_rgba(166,73,83,0.42),inset_0_1px_0_rgba(255,255,255,0.28)] hover:-translate-y-[2px]",
  outline:
    "shadow-[0_1px_2px_rgba(36,35,31,0.05),inset_0_1px_0_rgba(255,255,255,0.9)] " +
    "hover:border-neutral-4 hover:shadow-[0_2px_6px_-1px_rgba(36,35,31,0.10),inset_0_1px_0_rgba(255,255,255,0.95)] hover:-translate-y-[1px]",
  secondary:
    "shadow-[0_1px_2px_rgba(36,35,31,0.05),inset_0_1px_0_rgba(255,255,255,0.85)] " +
    "hover:shadow-[0_2px_6px_-1px_rgba(197,100,115,0.16),inset_0_1px_0_rgba(255,255,255,0.9)] hover:-translate-y-[1px]",
  ghost: "",
  link: "",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        buttonVariants({ variant, size }),
        depthByVariant[variant ?? "default"],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
export { buttonVariants };
