import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import type { LucideIcon } from "lucide-react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 animate-fade-in-up">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          {/* 梅色竖条：与顶栏呼应，同时托住标题 */}
          <span className="h-5 w-[3px] shrink-0 rounded-full bg-gradient-to-b from-[#cd6c7a] to-[#a64953]" />
          <h2 className="truncate font-serif text-[22px] font-semibold leading-tight tracking-tight text-text">
            {title}
          </h2>
        </div>
        {description && (
          <p className="mt-1.5 pl-[13px] text-sm text-muted">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
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
