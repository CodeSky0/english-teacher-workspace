import { cn } from "@/lib/utils";

/**
 * 图标按钮 IconButton
 *
 * 纯图标操作统一为 40×40 可点区域（满足触控命中率），并强制带 aria-label。
 * tone="danger" 用于删除类操作。
 */
export function IconButton({
  label,
  children,
  tone = "default",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** 无障碍名称，同时作为 title 提示；请带上对象名，如「删除 Unit 1」 */
  label: string;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-neutral-6",
        "transition-colors duration-[var(--dur-quick)] ease-[var(--ease-smooth)]",
        "hover:bg-neutral-2/70 hover:shadow-[var(--shadow-xs)]",
        tone === "danger" ? "hover:bg-[#f7dfe0]/60 hover:text-[#a64953]" : "hover:text-primary",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
