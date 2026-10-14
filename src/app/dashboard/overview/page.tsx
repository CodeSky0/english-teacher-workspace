import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { greeting, todayStr } from "@/lib/utils";
import { LayoutDashboard, CalendarDays, Users, BookOpen, GraduationCap } from "lucide-react";

export default function OverviewPage() {
  const stats = [
    { label: "今日课表", value: "—", icon: CalendarDays, color: "var(--c-listen)" },
    { label: "学生总人数", value: "—", icon: Users, color: "var(--c-vocab)" },
    { label: "待完成作业", value: "—", icon: BookOpen, color: "var(--c-homework)" },
    { label: "最近考试", value: "—", icon: GraduationCap, color: "var(--c-exam)" },
  ];

  return (
    <div>
      <PageHeader title="总览" description={`${greeting()}！今天是 ${todayStr()}`} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ background: `${s.color}1a`, color: s.color }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted">{s.label}</p>
                  <p className="text-xl font-bold text-text">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" />
              今日课表
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="py-8 text-center text-sm text-muted">
              暂无课表数据，请先设置课表
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutDashboard className="h-4 w-4" />
              快捷操作
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <a href="/dashboard/students" className="rounded-md border border-line p-3 text-sm hover:bg-bg">
                学生管理
              </a>
              <a href="/dashboard/schedule" className="rounded-md border border-line p-3 text-sm hover:bg-bg">
                设置课表
              </a>
              <a href="/dashboard/plans" className="rounded-md border border-line p-3 text-sm hover:bg-bg">
                新建备课
              </a>
              <a href="/classroom" className="rounded-md border border-line p-3 text-sm hover:bg-bg">
                课堂互动
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
