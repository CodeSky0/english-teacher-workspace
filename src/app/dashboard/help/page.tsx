import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Compass, Monitor, Palette, CloudUpload, ShieldCheck, Wrench, FileSpreadsheet, ArrowRight,
} from "lucide-react";

type Item = { text: string; swatch?: string };

const sections: { title: string; icon: typeof Compass; items: Item[] }[] = [
  {
    title: "如何使用英语教师工作台",
    icon: Compass,
    items: [
      { text: "注册账户并登录后，左侧导航栏提供 13 个功能模块。" },
      { text: "首先在「学生管理」中创建班级和导入学生名单。" },
      { text: "然后在「教学课表」中设置每周课表。" },
      { text: "在「备课与反思」中编写备课记录，在「作业与练习」中发布作业。" },
      { text: "在「学情分析」中录入考试成绩，系统会自动计算总分和生成统计图表。" },
      { text: "所有数据自动保存到服务器端的 PostgreSQL 数据库，无需手动点击保存按钮。" },
    ],
  },
  {
    title: "课堂互动操作说明",
    icon: Monitor,
    items: [
      { text: "按快捷键 C 或点击顶栏「课堂互动」按钮进入课堂模式。" },
      { text: "按 Esc 键退出课堂模式。" },
      { text: "课堂模式提供 8 个工具：随机点名、小组积分、课堂计时器、学生评价标签、课堂投票、座位考勤、单词卡、听写训练。" },
      { text: "随机点名支持空格键抽取下一位，支持排除缺勤学生。" },
      { text: "小组积分可创建小组并实时加减积分，积分数据自动保存。" },
      { text: "计时器支持正计时和倒计时，倒计时到时有提示音。" },
    ],
  },
  {
    title: "课表颜色规则",
    icon: Palette,
    items: [
      { text: "听力 / 听写", swatch: "listen" },
      { text: "语法 / 句型", swatch: "grammar" },
      { text: "阅读 / 读", swatch: "read" },
      { text: "写作 / 写 / 作文", swatch: "write" },
      { text: "词汇 / 单词 / 默写", swatch: "vocab" },
      { text: "口语 / 说 / 朗读 / 演讲", swatch: "speak" },
      { text: "习题 / 练习 / 复习 / 考试 / 测试 / 讲评", swatch: "exam" },
      { text: "作业", swatch: "homework" },
      { text: "其他", swatch: "other" },
    ],
  },
  {
    title: "如何更换电脑及同步数据",
    icon: CloudUpload,
    items: [
      { text: "本系统的所有数据保存在服务器端的 PostgreSQL 数据库中。" },
      { text: "更换电脑后，只需登录同一账户即可访问服务器中的全部数据。" },
      { text: "无需手动迁移文件，数据会自动从服务器同步到新设备。" },
      { text: "建议定期导出 JSON 备份到本地，作为额外的数据安全保障。" },
    ],
  },
  {
    title: "数据安全与备份",
    icon: ShieldCheck,
    items: [
      { text: "所有数据通过 HTTPS 加密传输。" },
      { text: "不同教师账户的数据完全隔离，互不可见。" },
      { text: "密码使用安全哈希存储，不会明文保存。" },
      { text: "删除操作采用软删除，可在回收站中恢复。" },
      { text: "在「设置」中可导出全量 JSON 备份，也可通过 JSON 文件恢复数据。" },
      { text: "恢复数据时使用数据库事务，失败会自动回滚。" },
    ],
  },
  {
    title: "故障排查",
    icon: Wrench,
    items: [
      { text: "无法登录：检查邮箱和密码是否正确，确认网络连接正常。" },
      { text: "数据不显示：刷新页面，检查网络连接，确认已登录正确账户。" },
      { text: "保存失败：检查网络连接，系统会显示「保存失败，点击重试」提示。" },
      { text: "页面白屏：清除浏览器缓存，重新登录。" },
      { text: "课堂数据丢失：检查是否登录了正确账户，联系管理员查看服务器状态。" },
    ],
  },
  {
    title: "Excel / CSV 导入导出指南",
    icon: FileSpreadsheet,
    items: [
      { text: "支持 9 个核心模块的 CSV 导入导出：学生、课表、备课、教研、作业、成绩、词汇、听写、资源。" },
      { text: "CSV 文件使用 UTF-8 编码（带 BOM），支持中文表头。" },
      { text: "导入时支持「追加导入」和「清空当前范围后导入」两种模式。" },
      { text: "导入前会预览数据和验证，确认无误后才执行写入。" },
      { text: "成绩导入时，如果提供了总分列，则使用填写值并标记为手动总分；否则自动计算听力+口语+笔试。" },
      { text: "词汇导入按单元名称归并，同一单元的单词会合并到一个单元中。" },
      { text: "可在各模块页面点击「导入 CSV」和「导出 CSV」按钮操作。" },
    ],
  },
];

const quickLinks = [
  { href: "/dashboard/students", label: "学生管理" },
  { href: "/dashboard/schedule", label: "教学课表" },
  { href: "/dashboard/plans", label: "备课与反思" },
  { href: "/dashboard/grades", label: "学情分析" },
  { href: "/classroom", label: "课堂互动" },
  { href: "/dashboard/settings", label: "设置与备份" },
];

const SWATCH_TEXT: Record<string, string> = {
  listen: "text-c-listen", grammar: "text-c-grammar", read: "text-c-read", write: "text-c-write",
  vocab: "text-c-vocab", speak: "text-c-speak", exam: "text-c-exam", homework: "text-c-homework", other: "text-c-other",
};
const SWATCH_BG: Record<string, string> = {
  listen: "bg-c-listen-bg", grammar: "bg-c-grammar-bg", read: "bg-c-read-bg", write: "bg-c-write-bg",
  vocab: "bg-c-vocab-bg", speak: "bg-c-speak-bg", exam: "bg-c-exam-bg", homework: "bg-c-homework-bg", other: "bg-c-other-bg",
};

export default function HelpPage() {
  return (
    <div>
      <PageHeader title="帮助" description="使用说明和常见问题解答" />

      {/* 快速入口 */}
      <div className="relative mb-5 overflow-hidden rounded-xl bg-gradient-to-br from-[#fdf6f2] via-[#fbf7f2] to-[#f4f1ea] p-5 edge-lit shadow-paper-sm">
        <div className="grid-veil pointer-events-none absolute inset-0 opacity-[0.5]" />
        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[#c56473]/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-14 left-1/3 h-36 w-36 rounded-full bg-[#3d6896]/10 blur-2xl" />
        <div className="relative">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#c56473]">Quick Start</p>
          <h2 className="mt-1 font-serif text-[19px] leading-snug">从这里开始</h2>
          <p className="mt-1 text-[13px] text-muted">按「学生管理 → 课表 → 备课 → 成绩」的顺序配置，即可完整运转整套教学流程。</p>
          <div className="mt-3.5 flex flex-wrap gap-2">
            {quickLinks.map((l) => (
              <Link key={l.href} href={l.href}
                className="group inline-flex items-center gap-1 rounded-full bg-panel px-3 py-1.5 text-xs text-neutral-6 shadow-[var(--shadow-xs)] ring-1 ring-inset ring-line transition-all duration-[var(--dur-quick)] hover:-translate-y-[1px] hover:text-primary-d hover:shadow-[var(--shadow-sm)]">
                {l.label}
                <ArrowRight className="h-3 w-3 -translate-x-0.5 opacity-0 transition-all duration-[var(--dur-quick)] group-hover:translate-x-0 group-hover:opacity-70" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((s, si) => {
          const Icon = s.icon;
          return (
            <Card key={s.title} className="self-start">
              <CardHeader>
                <CardTitle className="flex items-center gap-2.5 text-[15px]">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-b from-[#f8e4e7] to-[#f2d6da] font-serif text-[13px] font-semibold text-primary-d ring-1 ring-inset ring-[#c56473]/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                    {si + 1}
                  </span>
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="tracking-[0.01em]">{s.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2">
                  {s.items.map((it, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[13px] leading-[1.7] text-neutral-7">
                      {it.swatch ? (
                        <span className={`mt-[3px] inline-flex shrink-0 items-center rounded-md px-2 py-[1px] text-[11px] font-medium ring-1 ring-inset ring-black/[0.06] ${SWATCH_BG[it.swatch]} ${SWATCH_TEXT[it.swatch]}`}>
                          {it.text}
                        </span>
                      ) : (
                        <>
                          <span className="mt-[7px] h-1 w-1 shrink-0 rotate-45 rounded-[1px] bg-[#c56473]/55" />
                          <span>{it.text}</span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
