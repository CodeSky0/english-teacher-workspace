import * as React from "react";
import { cn } from "@/lib/utils";

/** 输入框共用样式：轻微内凹 + 聚焦时梅色光晕 */
const fieldBase = [
  "flex w-full rounded-lg border border-line bg-gradient-to-b from-[#fffefd] to-[#faf9f7] px-3 text-sm",
  "shadow-[inset_0_1px_2px_rgba(36,35,31,0.045)]",
  "transition-all duration-[var(--dur-quick)] ease-[var(--ease-smooth)]",
  "placeholder:text-neutral-5",
  "hover:border-neutral-4",
  "focus-visible:outline-none focus-visible:border-primary/55",
  "focus-visible:shadow-[inset_0_1px_2px_rgba(36,35,31,0.03),0_0_0_4px_rgba(197,100,115,0.13)]",
  "disabled:opacity-50 disabled:cursor-not-allowed",
].join(" ");

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(fieldBase, "h-9 py-1", className)}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(fieldBase, "min-h-[80px] py-2", className)}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("block text-xs font-medium tracking-wide text-neutral-7", className)}
      {...props}
    />
  )
);
Label.displayName = "Label";
