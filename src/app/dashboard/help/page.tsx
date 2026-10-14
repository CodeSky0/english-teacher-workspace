import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";

const sections = [
  {
    title: "1. 如何使用英语教师工作台",
    content: [
      "注册账户并登录后，左侧导航栏提供 13 个功能模块。",
      "首先在「学生管理」中创建班级和导入学生名单。",
      "然后在「教学课表」中设置每周课表。",
      "在「备棵与反思」中编写备课记录，在「作业与练习」中发布作业。",
      "在「学情分析」中录入考试成绩，系统会自动计算总分和生成统计图表。",
      "所有数据自动保存到服务器端的 PostgreSQL 数据库，无需手动点击保存按钮。",
    ],
  },
  {
    title: "2. 课堂互动操作说明",
    content: [
      "按快捷键 C 或点击顶栏「课堂互动」按钮进入课堂模式。",
      "按 Esc 键退出课堂模式。",
      "课堂模式提供 8 个工具：随机点名、小组积分、课堂计时器、学生评价标签、课堂投票、座位考勤、单词卡、听写训练。",
      "随机点名支持空格键抽取下一位，支持排除缺勤学生。",
      "小组积分可创建小组并实时加减积分，积分数据自动保存。",
      "计时器支持正计时和倒计时，倒计时到时有提示音。",
    ],
  },
  {
    title: "3. 课表颜色规则",
    content: [
      "听力/听写 → 蓝色 (listen)",
      "语法/句型 → 橙色 (grammar)",
      "阅读/读 → 绿色 (read)",
      "写作/写/作文 → 红色 (write)",
      "词汇/单词/默写 → 灰色 (vocab)",
      "口语/说/朗读/演讲 → 青色 (speak)",
      "习题/练习/复习/考试/测试/讲评 → 橙红色 (exam)",
      "作业 → 紫色 (homework)",
      "其他 → 浅灰色 (other)",
    ],
  },
  {
    title: "4. 如何更换电脑及同步数据",
    content: [
      "本系统的所有数据保存在服务器端的 PostgreSQL 数据库中。",
      "更换电脑后，只需登录同一账户即可访问服务器中的全部数据。",
      "无需手动迁移文件，数据会自动从服务器同步到新设备。",
      "建议定期导出 JSON 备份到本地，作为额外的数据安全保障。",
    ],
  },
  {
    title: "5. 数据安全与备份",
    content: [
      "所有数据通过 HTTPS 加密传输。",
      "不同教师账户的数据完全隔离，互不可见。",
      "密码使用安全哈希存储，不会明文保存。",
      "删除操作采用软删除，可在回收站中恢复。",
      "在「设置」中可导出全量 JSON 备份，也可通过 JSON 文件恢复数据。",
      "恢复数据时使用数据库事务，失败会自动回滚。",
    ],
  },
  {
    title: "6. 故障排查",
    content: [
      "无法登录：检查邮箱和密码是否正确，确认网络连接正常。",
      "数据不显示：刷新页面，检查网络连接，确认已登录正确账户。",
      "保存失败：检查网络连接，系统会显示「保存失败，点击重试」提示。",
      "页面白屏：清除浏览器缓存，重新登录。",
      "课堂数据丢失：检查是否登录了正确账户，联系管理员查看服务器状态。",
    ],
  },
  {
    title: "7. Excel/CSV 导入导出指南",
    content: [
      "支持 9 个核心模块的 CSV 导入导出：学生、课表、备课、教研、作业、成绩、词汇、听写、资源。",
      "CSV 文件使用 UTF-8 编码（带 BOM），支持中文表头。",
      "导入时支持「追加导入」和「清空当前范围后导入」两种模式。",
      "导入前会预览数据和验证，确认无误后才执行写入。",
      "成绩导入时，如果提供了总分列，则使用填写值并标记为手动总分；否则自动计算听力+口语+笔试。",
      "词汇导入按单元名称归并，同一单元的单词会合并到一个单元中。",
      "可在各模块页面点击「导入 CSV」和「导出 CSV」按钮操作。",
    ],
  },
];

export default function HelpPage() {
  return (
    <div>
      <PageHeader title="帮助" description="使用说明和常见问题解答" />
      <div className="space-y-4">
        {sections.map((s) => (
          <Card key={s.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <HelpCircle className="h-4 w-4 text-primary" />
                {s.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {s.content.map((line, i) => (
                  <li key={i} className="text-sm text-muted">
                    · {line}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
