import { cn } from "@/lib/utils";

/**
 * 玻璃工具条 GlassToolbar
 *
 * 页面内的筛选 / 搜索 / 图例 / 批量操作统一放进一条「玻璃托盘」：
 * 半透明白 + 背景模糊 + 顶部 1px 高光，让工具浮在纸面之上而不抢内容。
 * 纯展示容器，不改变任何交互逻辑。
 */
export function GlassToolbar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-wrap items-center gap-2.5 rounded-xl border border-white/70 bg-white/60 px-3 py-2",
        "shadow-[0_1px_2px_rgba(36,35,31,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md",
        className
      )}
    >
      {children}
    </div>
  );
}
