import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-[var(--dur-smooth)] ease-[var(--ease-smooth)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-white shadow-paper-sm hover:bg-primary-d hover:shadow-paper-md hover:-translate-y-0.5",
        outline:
          "border border-line bg-panel shadow-paper-xs text-text hover:bg-bg hover:border-neutral-4 hover:shadow-paper-sm hover:-translate-y-0.5",
        ghost:
          "text-text hover:bg-neutral-3/60",
        destructive:
          "bg-red-600 text-white shadow-paper-sm hover:bg-red-700 hover:shadow-paper-md hover:-translate-y-0.5",
        secondary:
          "bg-primary-l text-primary-d hover:bg-primary-l/70 hover:shadow-paper-xs",
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

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";
export { buttonVariants };
