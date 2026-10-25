import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 下一步动作卡 NextStepCard
 *
 * 记录很少时页面底部容易「空得像加载失败」。这张收尾卡给出明确的下一步动作，
 * 让页面在数据结构稀疏时依然完整。
 */
export function NextStepCard({
  icon: Icon,
  eyebrow = "Next Step",
  title,
  description,
  actions,
  className,
}: {
  icon?: LucideIcon;
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "reveal relative mt-4 overflow-hidden rounded-2xl edge-lit spotlight shadow-paper-sm",
        className
      )}
    >
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(112deg,#fffaf8_0%,#fefcf7_44%,#f5f7fa_100%)]" />
      <span className="pointer-events-none absolute inset-0 dot-veil opacity-[0.2]" />
      <span className="pointer-events-none absolute -right-14 -top-20 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(197,100,115,0.14),transparent_68%)]" />
      <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          {Icon && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#f8e4e7] to-[#f2d6da] text-primary-d ring-1 ring-inset ring-[#c56473]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
              <Icon className="h-[18px] w-[18px]" />
            </span>
          )}
          <div className="min-w-0">
            <p className="eyebrow leading-none">{eyebrow}</p>
            <p className="mt-1.5 font-serif text-[17px] font-semibold tracking-[0.01em] text-text">{title}</p>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-neutral-6">{description}</p>
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </section>
  );
}
