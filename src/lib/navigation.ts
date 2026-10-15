import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  Users,
  GraduationCap,
  BookOpen,
  Headphones,
  FolderOpen,
  Sparkles,
  Settings,
  HelpCircle,
  PenLine,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavGroup = {
  group: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    group: "工作台",
    items: [{ label: "总览", href: "/dashboard/overview", icon: LayoutDashboard }],
  },
  {
    group: "教学准备",
    items: [
      { label: "教学课表", href: "/dashboard/schedule", icon: CalendarDays },
      { label: "备课与反思", href: "/dashboard/plans", icon: ClipboardList },
      { label: "教学教研", href: "/dashboard/research", icon: PenLine },
    ],
  },
  {
    group: "学生与评价",
    items: [
      { label: "学生管理", href: "/dashboard/students", icon: Users },
      { label: "作业与练习", href: "/dashboard/homework", icon: BookOpen },
      { label: "学情分析", href: "/dashboard/grades", icon: GraduationCap },
    ],
  },
  {
    group: "资源中心",
    items: [
      { label: "词汇中心", href: "/dashboard/vocab", icon: BookOpen },
      { label: "听写词表", href: "/dashboard/dictation", icon: Headphones },
      { label: "资源库", href: "/dashboard/resources", icon: FolderOpen },
    ],
  },
  {
    group: "教学辅助",
    items: [
      { label: "AI 助手", href: "/dashboard/ai", icon: Sparkles },
      { label: "设置", href: "/dashboard/settings", icon: Settings },
      { label: "帮助", href: "/dashboard/help", icon: HelpCircle },
    ],
  },
];

export const allNavItems: NavItem[] = navGroups.flatMap((g) => g.items);

export function getNavTitle(pathname: string): string {
  const item = allNavItems.find((i) => pathname.startsWith(i.href));
  return item?.label ?? "工作台";
}
