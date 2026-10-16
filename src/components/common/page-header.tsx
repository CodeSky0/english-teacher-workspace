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
    <div className="mb-6 flex items-start justify-between animate-fade-in-up">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-text">{title}</h2>
        {description && (
          <p className="mt-1.5 text-sm text-muted">{description}</p>
        )}
      </div>
      {action}
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
