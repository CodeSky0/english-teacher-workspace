import { navGroups } from "@/lib/navigation";

/**
 * 导航 / 页头的英文小标（eyebrow）映射
 *
 * 与 `src/lib/navigation.ts` 的中文分组一一对应，但故意放在展示层：
 * 导航数据结构保持稳定，英文小标只服务于排版（Washi Aurora v4 的排版层）。
 */
const NAV_EN: Record<string, string> = {
  总览: "Overview",
  学期规划: "Semester",
  教学课表: "Timetable",
  备课与反思: "Lesson Plans",
  教学教研: "Research",
  学生管理: "Students",
  作业与练习: "Homework",
  学情分析: "Analytics",
  课堂互动: "Classroom",
  词汇中心: "Vocabulary",
  听写词表: "Dictation",
  资源库: "Resources",
  "AI 助手": "AI Assistant",
  设置: "Settings",
  帮助: "Help",
};

/** 侧边栏分组的英文小标 */
const GROUP_EN: Record<string, string> = {
  工作台: "Workspace",
  教学准备: "Prepare",
  学生与评价: "People",
  资源中心: "Library",
  教学辅助: "Assist",
};

/** 当前页所属分组的英文名：顶栏用它做「栏目」小标，页头用页面英文名，避免同一词重复两次 */
export function groupEnglishOf(title: string): string | undefined {
  const group = navGroups.find((g) => g.items.some((item) => item.label === title));
  return group ? groupEnglish(group.group) : undefined;
}

/** 当前页所属分组的中文名：顶栏面包屑用 */
export function groupNameOf(title: string): string | undefined {
  const group = navGroups.find((g) => g.items.some((item) => item.label === title));
  return group?.group;
}


export function navEnglish(title: string): string | undefined {
  return NAV_EN[title];
}

export function groupEnglish(group: string): string {
  return GROUP_EN[group] ?? "Section";
}