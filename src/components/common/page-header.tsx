import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { navEnglish } from "@/components/layout/nav-meta";
import type { LucideIcon } from "lucide-react";

/**
 * 页面头（Washi Aurora v4）
 *
 * - 英文 eyebrow 小标（由标题自动映射，也可显式传入）
 * - 26–30px 衬线大标题（页面唯一 H1）+ 渐变现光装饰条
 * - 右侧操作区玻璃化托盘，让主按钮浮在纸面上
 */
export function PageHeader({
  title,
  description,
  action,
  eyebrow,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  eyebrow?: string;
}) {
  const en = eyebrow ?? navEnglish(title);

  return (
    <div className="mb-6 flex animate-fade-in-up flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-x-4">
      <div className="min-w-0 sm:flex-1">
        {en && (
          <p className="eyebrow mb-1.5 flex items-center gap-2 text-neutral-5">
            {en}
            <span className="h-px w-8 bg-[linear-gradient(90deg,rgba(197,100,115,0.45),transparent)]" />
          </p>
        )}
        <div className="flex items-center gap-3">
          {/* 梅色竖条：渐变 + 柔光，托住标题 */}
          <span className="h-6 w-[3px] shrink-0 rounded-full bg-[linear-gradient(180deg,#d97787_0%,#c56473_52%,#a64953_100%)] shadow-[0_0_10px_rgba(197,100,115,0.40)]" />
          <h1 className="truncate font-serif text-[26px] font-semibold leading-tight tracking-tight text-text sm:text-[29px]">
            {title}
          </h1>
        </div>
        {description && <p className="mt-1.5 pl-[15px] text-sm text-muted">{description}</p>}
      </div>
      {action && (
        <div className="max-w-full shrink-0 self-end rounded-xl border border-white/70 bg-white/55 p-1 shadow-[0_1px_2px_rgba(36,35,31,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md sm:self-auto">
          <div className="flex flex-wrap items-center justify-end gap-2">{action}</div>
        </div>
      )}
    </div>
  );
}

export function PageSkeleton({
  title,
  description,
  icon: Icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <div>
      <PageHeader title={title} description={description} action={action} />
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={Icon ? <Icon className="h-10 w-10" /> : undefined}
            title="暂无数据"
            description="点击上方按钮开始添加"
          />
        </CardContent>
      </Card>
    </div>
  );
}