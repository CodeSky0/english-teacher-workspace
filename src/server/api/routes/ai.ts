import { Hono } from "hono";

const routes = new Hono<{ Variables: { user: { id: string }; session: any } }>();

const templates: Record<string, string> = {
  objectives: "教学目标：\n1. 知识目标：掌握本课核心词汇和句型\n2. 能力目标：能够运用所学语言进行交际\n3. 情感目标：培养学习英语的兴趣和信心",
  process: "教学过程：\n一、导入（5分钟）\n  通过图片/视频导入话题\n二、呈现（10分钟）\n  讲解新词汇和句型\n三、练习（15分钟）\n  机械练习 → 意义练习 → 交际练习\n四、产出（10分钟）\n  学生综合运用语言完成任务\n五、总结（5分钟）\n  回顾要点，布置作业",
  reading: "阅读课活动设计：\n1. Pre-reading：预测内容，激活背景知识\n2. While-reading：\n   - Skimming：主旨大意\n   - Scanning：细节信息\n   - Careful reading：推理判断\n3. Post-reading：讨论、复述、写作延伸",
  listening: "听说课活动设计：\n1. Pre-listening：图片预测，词汇铺垫\n2. While-listening：\n   - 第一遍：主旨\n   - 第二遍：细节\n3. Post-listening：角色扮演，口语输出",
  vocab: "词汇练习草稿：\n1. 朗读单词，标注音标\n2. 词义匹配练习\n3. 用单词造句\n4. 完成填空\n5. 小组竞赛拼写",
  evaluation: "课堂评价语言：\n- Good job! 你做得很好！\n- Excellent! 非常出色！\n- Well done! 干得漂亮！\n- Keep trying! 继续努力！\n- Don't be afraid to make mistakes. 不要害怕犯错。",
  remark: "学生评语草稿：\n该生在英语课堂上表现积极，能够主动参与课堂活动，口语表达清晰流利。建议课后多加强阅读和写作练习，继续巩固词汇基础。",
  reflection: "教学反思框架：\n1. 教学目标达成情况\n2. 学生活动参与度\n3. 课堂时间分配\n4. 教学方法有效性\n5. 改进措施",
};

routes.get("/templates", (c) => c.json({ data: Object.keys(templates) }));

routes.post("/generate", async (c) => {
  const body = await c.req.json();
  const { template, context } = body;
  const content = templates[template] || "未知模板";
  return c.json({
    data: {
      content,
      template,
      isTemplate: true,
      note: "此内容由本地模板生成，非 AI 模型生成",
    },
  });
});

routes.post("/chat", async (c) => {
  if (!process.env.AI_API_KEY) {
    return c.json({
      data: {
        content: "AI 服务未配置。当前使用本地模板模式，请在设置中配置 AI API Key 后使用完整 AI 功能。",
        isTemplate: true,
      },
    });
  }

  try {
    const body = await c.req.json();
    const { messages } = body;
    const res = await fetch(`${process.env.AI_API_BASE_URL || "https://api.openai.com/v1"}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "gpt-4o-mini",
        messages,
        max_tokens: 2000,
      }),
    });
    const json = await res.json();
    return c.json({ data: { content: json.choices?.[0]?.message?.content || "", isTemplate: false } });
  } catch {
    return c.json({ error: { code: "AI_ERROR", message: "AI 服务调用失败" } }, 500);
  }
});

export { routes as aiRoutes };
