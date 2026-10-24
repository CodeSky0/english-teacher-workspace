import { Hono } from "hono";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { rateLimit } from "@/server/redis";
import { db } from "@/server/db";
import { vocabWords, vocabUnits } from "@/db/schema/vocab";
import { examScores, exams } from "@/db/schema/exams";
import { students, classes } from "@/db/schema/classes";
import { dictationResults, dictationWords, dictationLists } from "@/db/schema/dictation";
import { badRequest, notFound } from "../errors";
import type { RouteEnv } from "../env";

const routes = new Hono<RouteEnv>();

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

async function callAI(messages: { role: string; content: string }[], systemPrompt?: string): Promise<{ content: string; isTemplate: boolean }> {
  if (!process.env.AI_API_KEY) {
    return { content: "", isTemplate: true };
  }
  const fullMessages = systemPrompt ? [{ role: "system", content: systemPrompt }, ...messages] : messages;
  const res = await fetch(`${process.env.AI_API_BASE_URL || "https://api.openai.com/v1"}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.AI_API_KEY}` },
    body: JSON.stringify({ model: process.env.AI_MODEL || "gpt-4o-mini", messages: fullMessages, max_tokens: 2000, temperature: 0.7 }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || "AI 服务返回错误");
  return { content: json.choices?.[0]?.message?.content || "", isTemplate: false };
}

routes.get("/templates", (c) => c.json({ data: Object.keys(templates) }));

routes.post("/generate", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { template } = body ?? {};
  const content = templates[template] || "未知模板";
  return c.json({ data: { content, template, isTemplate: true, note: "此内容由本地模板生成，非 AI 模型生成" } });
});

routes.post("/chat", async (c) => {
  const user = c.get("user");
  const rl = await rateLimit(`ai:${user.id}`, 20, 60);
  if (!rl.ok) return c.json({ error: { code: "RATE_LIMIT", message: "请求过于频繁，请稍后再试" } }, 429);

  if (!process.env.AI_API_KEY) {
    return c.json({ data: { content: "AI 服务未配置。当前使用本地模板模式，请在设置中配置 AI API Key 后使用完整 AI 功能。", isTemplate: true } });
  }
  try {
    const body = await c.req.json();
    const { messages } = body;
    const result = await callAI(messages);
    return c.json({ data: result });
  } catch {
    return c.json({ error: { code: "AI_ERROR", message: "AI 服务调用失败" } }, 500);
  }
});

// ------------------------------------------------------------ 教案一键生成

routes.post("/lesson-plan", async (c) => {
  const user = c.get("user");
  const rl = await rateLimit(`ai:${user.id}`, 20, 60);
  if (!rl.ok) return c.json({ error: { code: "RATE_LIMIT", message: "请求过于频繁，请稍后再试" } }, 429);

  const body = await c.req.json().catch(() => ({}));
  const { title, unit, gradeLevel, lessonType, objectives, classId } = body ?? {};

  let classInfo = "";
  if (classId) {
    const [klass] = await db.select().from(classes).where(and(eq(classes.id, classId), eq(classes.userId, user.id), isNull(classes.deletedAt)));
    if (klass) classInfo = `班级：${klass.name}（${klass.gradeLevel ?? ""}）\n`;
  }

  const prompt = `请为以下英语课生成一份详细教案：\n${classInfo}课题：${title || "未指定"}\n单元：${unit || "未指定"}\n年级：${gradeLevel || "未指定"}\n课型：${lessonType || "新授课"}\n已有目标参考：${objectives || "无"}\n\n请按以下结构输出：\n一、教学目标（知识/能力/情感）\n二、教学重点与难点\n三、教学过程（导入→呈现→练习→产出→总结，标注时间分配）\n四、板书设计\n五、作业布置`;

  try {
    const result = await callAI([{ role: "user", content: prompt }], "你是一位经验丰富的中小学英语教师，擅长设计结构清晰、活动丰富的教案。请用中文输出。");
    if (result.isTemplate && !result.content) {
      return c.json({ data: { content: templates.process, isTemplate: true, note: "AI 未配置，已返回本地模板" } });
    }
    return c.json({ data: result });
  } catch {
    return c.json({ data: { content: templates.process, isTemplate: true, note: "AI 调用失败，已返回本地模板" } });
  }
});

// ------------------------------------------------------------ 学情评语生成

routes.post("/remark", async (c) => {
  const user = c.get("user");
  const rl = await rateLimit(`ai:${user.id}`, 20, 60);
  if (!rl.ok) return c.json({ error: { code: "RATE_LIMIT", message: "请求过于频繁，请稍后再试" } }, 429);

  const body = await c.req.json().catch(() => ({}));
  const { studentId, classId } = body ?? {};
  if (!studentId) return badRequest(c, "缺少 studentId");

  const [student] = await db.select().from(students).where(and(eq(students.id, studentId), eq(students.userId, user.id), isNull(students.deletedAt)));
  if (!student) return notFound(c, "学生不存在");

  const [scores, dictLists, dictWords, dictRes] = await Promise.all([
    db.select().from(examScores).where(and(eq(examScores.studentId, studentId), eq(examScores.userId, user.id), isNull(examScores.deletedAt))),
    db.select().from(dictationLists).where(and(eq(dictationLists.userId, user.id), eq(dictationLists.classId, classId || student.classId), isNull(dictationLists.deletedAt))),
    db.select().from(dictationWords).where(and(eq(dictationWords.userId, user.id), isNull(dictationWords.deletedAt))),
    db.select().from(dictationResults).where(and(eq(dictationResults.studentId, studentId), eq(dictationResults.userId, user.id), isNull(dictationResults.deletedAt))),
  ]);

  const examIds = scores.map((s) => s.examId);
  const examRows = examIds.length ? await db.select().from(exams).where(and(inArray(exams.id, examIds), eq(exams.userId, user.id))) : [];
  const examNameById = new Map(examRows.map((e) => [e.id, e.name]));

  const examSummary = scores.map((s) => `${examNameById.get(s.examId) ?? "考试"}: 听${s.listeningScore ?? "-"} 说${s.speakingScore ?? "-"} 写${s.writtenScore ?? "-"} 总${s.totalScore ?? "-"}`).join("；");

  const listIds = dictLists.map((l) => l.id);
  const wordMap = new Map(dictWords.map((w) => [w.id, w.word]));
  let dictSummary = "";
  if (listIds.length) {
    const studentDictRes = dictRes.filter((r) => listIds.includes(r.listId));
    const wrongWords = new Set<string>();
    let correct = 0, total = 0;
    for (const r of studentDictRes) {
      if (r.isCorrect === null) continue;
      total++;
      if (r.isCorrect) correct++;
      else { const w = wordMap.get(r.wordId); if (w) wrongWords.add(w); }
    }
    dictSummary = `听写正确率: ${total ? ((correct / total) * 100).toFixed(0) : 0}%，高频错词: ${[...wrongWords].slice(0, 10).join("、") || "无"}`;
  }

  const prompt = `请为以下学生生成一段期末评语（150-200字，中文）：\n姓名：${student.name}（${student.enName ?? ""}）\n${examSummary ? `考试成绩：${examSummary}\n` : ""}${dictSummary ? `听写情况：${dictSummary}\n` : ""}\n评语要求：\n1. 肯定优点，指出不足\n2. 结合具体数据（听说读写偏科情况）\n3. 给出针对性建议\n4. 语气温暖鼓励`;

  try {
    const result = await callAI([{ role: "user", content: prompt }], "你是一位关爱学生的英语老师，擅长写温暖而有针对性的评语。请用中文输出。");
    if (result.isTemplate && !result.content) {
      return c.json({ data: { content: templates.remark, isTemplate: true, note: "AI 未配置，已返回本地模板" } });
    }
    return c.json({ data: result });
  } catch {
    return c.json({ data: { content: templates.remark, isTemplate: true, note: "AI 调用失败，已返回本地模板" } });
  }
});

// ------------------------------------------------------------ 自动出题

routes.post("/exercise", async (c) => {
  const user = c.get("user");
  const rl = await rateLimit(`ai:${user.id}`, 20, 60);
  if (!rl.ok) return c.json({ error: { code: "RATE_LIMIT", message: "请求过于频繁，请稍后再试" } }, 429);

  const body = await c.req.json().catch(() => ({}));
  const { unitId, exerciseType, count } = body ?? {};
  if (!unitId) return badRequest(c, "缺少 unitId");

  const [unit] = await db.select().from(vocabUnits).where(and(eq(vocabUnits.id, unitId), eq(vocabUnits.userId, user.id), isNull(vocabUnits.deletedAt)));
  if (!unit) return notFound(c, "词汇单元不存在");

  const words = await db.select().from(vocabWords).where(and(eq(vocabWords.unitId, unitId), eq(vocabWords.userId, user.id), isNull(vocabWords.deletedAt)));
  if (words.length === 0) return badRequest(c, "该单元没有单词");

  const wordList = words.map((w) => `${w.word}（${w.meaning ?? ""}）`).join("、");
  const type = exerciseType || "mixed";
  const num = Math.min(20, Math.max(5, Number(count) || 10));

  const typeDesc: Record<string, string> = {
    "choice": "单项选择题",
    "fill": "填空题",
    "match": "词义匹配题",
    "sentence": "造句题",
    "mixed": "混合题型（选择+填空+匹配）",
  };

  const prompt = `请基于以下词汇生成${num}道${typeDesc[type] ?? "练习题"}：\n词汇：${wordList}\n\n要求：\n1. 题目难度适中，适合中小学生\n2. 每道题附参考答案\n3. 输出格式清晰（题号、题干、选项/空格、答案）`;

  try {
    const result = await callAI([{ role: "user", content: prompt }], "你是一位专业的英语教师，擅长设计词汇练习题。请用中文出题，英文内容用英文。");
    if (result.isTemplate && !result.content) {
      const local = `词汇练习（${unit.name}）\n\n一、词义匹配\n${words.slice(0, 10).map((w, i) => `${i + 1}. ${w.word} — (____)`).join("\n")}\n\n二、填空\n${words.slice(0, 5).map((w, i) => `${i + 1}. I need to buy some ${w.meaning ?? "___"} today.`).join("\n")}`;
      return c.json({ data: { content: local, isTemplate: true, note: "AI 未配置，已返回本地模板" } });
    }
    return c.json({ data: result });
  } catch {
    return c.json({ data: { content: templates.vocab, isTemplate: true, note: "AI 调用失败，已返回本地模板" } });
  }
});

// ------------------------------------------------------------ 听写 AI 批改

routes.post("/dictation-grade", async (c) => {
  const user = c.get("user");
  const rl = await rateLimit(`ai:${user.id}`, 20, 60);
  if (!rl.ok) return c.json({ error: { code: "RATE_LIMIT", message: "请求过于频繁，请稍后再试" } }, 429);

  const body = await c.req.json().catch(() => ({}));
  const { answers } = body ?? {};
  if (!Array.isArray(answers) || answers.length === 0) return badRequest(c, "缺少 answers");

  const prompt = `请批改以下英语听写答案，判断每个学生写的词是否正确（允许大小写差异，拼写错误判错）：\n${answers.map((a: { word: string; answer: string }, i: number) => `${i + 1}. 正确词: ${a.word}，学生写: ${a.answer}`).join("\n")}\n\n请只输出 JSON 数组，如 [true, false, true]，不要输出其他内容。`;

  try {
    const result = await callAI([{ role: "user", content: prompt }], "你是听写批改助手。只输出 JSON 数组。");
    if (result.isTemplate && !result.content) {
      const grades = answers.map((a: { word: string; answer: string }) => a.answer.trim().toLowerCase() === a.word.trim().toLowerCase());
      return c.json({ data: { grades, isTemplate: true, note: "AI 未配置，使用本地精确匹配" } });
    }
    const match = result.content.match(/\[[\s\S]*\]/);
    let grades: boolean[];
    try {
      const parsed = match ? JSON.parse(match[0]) : null;
      grades = Array.isArray(parsed) ? parsed.map((v: unknown) => Boolean(v)) : answers.map(() => false);
    } catch {
      grades = answers.map(() => false);
    }
    return c.json({ data: { grades, isTemplate: false } });
  } catch {
    const grades = answers.map((a: { word: string; answer: string }) => a.answer.trim().toLowerCase() === a.word.trim().toLowerCase());
    return c.json({ data: { grades, isTemplate: true, note: "AI 调用失败，使用本地精确匹配" } });
  }
});

export { routes as aiRoutes };
