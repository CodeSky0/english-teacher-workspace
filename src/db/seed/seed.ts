import { db } from "@/server/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

const SAMPLE_CLASSES = [
  { name: "高一(3)班", enName: "Class 3", gradeLevel: "高一", academicYear: "2026-2027" },
  { name: "高一(7)班", enName: "Class 7", gradeLevel: "高一", academicYear: "2026-2027" },
  { name: "高一(2)班", enName: "Class 2", gradeLevel: "高一", academicYear: "2026-2027" },
];

const SAMPLE_STUDENTS = [
  { name: "李明", enName: "Li Ming", gender: "male" as const, studentNo: "001", seatNo: 1 },
  { name: "王芳", enName: "Wang Fang", gender: "female" as const, studentNo: "002", seatNo: 2 },
  { name: "张伟", enName: "Zhang Wei", gender: "male" as const, studentNo: "003", seatNo: 3 },
  { name: "刘洋", enName: "Liu Yang", gender: "male" as const, studentNo: "004", seatNo: 4 },
  { name: "陈静", enName: "Chen Jing", gender: "female" as const, studentNo: "005", seatNo: 5 },
  { name: "赵磊", enName: "Zhao Lei", gender: "male" as const, studentNo: "006", seatNo: 6 },
  { name: "孙丽", enName: "Sun Li", gender: "female" as const, studentNo: "007", seatNo: 7 },
  { name: "周强", enName: "Zhou Qiang", gender: "male" as const, studentNo: "008", seatNo: 8 },
  { name: "吴敏", enName: "Wu Min", gender: "female" as const, studentNo: "009", seatNo: 9 },
  { name: "郑浩", enName: "Zheng Hao", gender: "male" as const, studentNo: "010", seatNo: 10 },
  { name: "钱雪", enName: "Qian Xue", gender: "female" as const, studentNo: "011", seatNo: 11 },
  { name: "冯波", enName: "Feng Bo", gender: "male" as const, studentNo: "012", seatNo: 12 },
  { name: "蒋琳", enName: "Jiang Lin", gender: "female" as const, studentNo: "013", seatNo: 13 },
  { name: "韩锐", enName: "Han Rui", gender: "male" as const, studentNo: "014", seatNo: 14 },
  { name: "杨梅", enName: "Yang Mei", gender: "female" as const, studentNo: "015", seatNo: 15 },
  { name: "朱涛", enName: "Zhu Tao", gender: "male" as const, studentNo: "016", seatNo: 16 },
  { name: "秦悦", enName: "Qin Yue", gender: "female" as const, studentNo: "017", seatNo: 17 },
  { name: "许鹏", enName: "Xu Peng", gender: "male" as const, studentNo: "018", seatNo: 18 },
  { name: "何婷", enName: "He Ting", gender: "female" as const, studentNo: "019", seatNo: 19 },
  { name: "吕刚", enName: "Lv Gang", gender: "male" as const, studentNo: "020", seatNo: 20 },
  { name: "施雯", enName: "Shi Wen", gender: "female" as const, studentNo: "021", seatNo: 21 },
  { name: "张鑫", enName: "Zhang Xin", gender: "male" as const, studentNo: "022", seatNo: 22 },
];

const SAMPLE_VOCAB: Array<{ unit: string; words: Array<{ w: string; m: string; p: string }> }> = [
  {
    unit: "Unit 1",
    words: [
      { w: "explore", m: "探索；探究", p: "v." },
      { w: "curious", m: "好奇的", p: "adj." },
      { w: "adventure", m: "冒险", p: "n." },
      { w: "discover", m: "发现", p: "v." },
      { w: "ancient", m: "古代的", p: "adj." },
      { w: "culture", m: "文化", p: "n." },
      { w: "tradition", m: "传统", p: "n." },
      { w: "journey", m: "旅程", p: "n." },
      { w: "experience", m: "经历；体验", p: "n./v." },
      { w: "remarkable", m: "非凡的", p: "adj." },
    ],
  },
  {
    unit: "Unit 2",
    words: [
      { w: "improve", m: "改善；提高", p: "v." },
      { w: "ability", m: "能力", p: "n." },
      { w: "achieve", m: "实现；达到", p: "v." },
      { w: "success", m: "成功", p: "n." },
      { w: "effort", m: "努力", p: "n." },
      { w: "challenge", m: "挑战", p: "n." },
      { w: "overcome", m: "克服", p: "v." },
      { w: "confident", m: "自信的", p: "adj." },
      { w: "progress", m: "进步", p: "n." },
      { w: "determine", m: "决定；决心", p: "v." },
    ],
  },
  {
    unit: "Unit 3",
    words: [
      { w: "environment", m: "环境", p: "n." },
      { w: "protect", m: "保护", p: "v." },
      { w: "pollution", m: "污染", p: "n." },
      { w: "recycle", m: "回收利用", p: "v." },
      { w: "reduce", m: "减少", p: "v." },
      { w: "resource", m: "资源", p: "n." },
      { w: "sustainable", m: "可持续的", p: "adj." },
      { w: "energy", m: "能源", p: "n." },
      { w: "climate", m: "气候", p: "n." },
      { w: "conserve", m: "保护；保存", p: "v." },
    ],
  },
];

const SAMPLE_RESOURCES = [
  { title: "高一英语上册课件 Unit 1", type: "courseware" as const, link: "https://example.com/u1courseware" },
  { title: "高一英语上册课件 Unit 2", type: "courseware" as const, link: "https://example.com/u2courseware" },
  { title: "阅读理解练习题", type: "exam" as const, link: "https://example.com/reading-exam" },
  { title: "听力材料 Unit 1", type: "audio" as const, link: "https://example.com/u1audio" },
  { title: "教学视频：定语从句", type: "video" as const, link: "https://example.com/grammar-video" },
  { title: "教研论文：任务型教学法", type: "research" as const, link: "https://example.com/research-paper" },
  { title: "课外阅读材料", type: "reading" as const, link: "https://example.com/reading-material" },
];

export async function seedSampleData(userId: string) {
  const existing = await db.select().from(schema.classes)
    .where(eq(schema.classes.userId, userId));
  if (existing.some((c) => c.isSample)) {
    console.log("示例数据已存在，跳过");
    return;
  }

  const classIds: string[] = [];
  for (const cls of SAMPLE_CLASSES) {
    const [created] = await db.insert(schema.classes).values({
      ...cls, userId, isSample: true,
    }).returning();
    classIds.push(created.id);
  }

  for (let i = 0; i < SAMPLE_STUDENTS.length; i++) {
    const student = SAMPLE_STUDENTS[i];
    const classId = classIds[i % classIds.length];
    await db.insert(schema.students).values({
      ...student, userId, classId, isSample: true,
    });
  }

  for (const unit of SAMPLE_VOCAB) {
    const [unitRecord] = await db.insert(schema.vocabUnits).values({
      name: unit.unit, userId, isSample: true,
      textbookVersion: "人教版", gradeLevel: "高一",
    }).returning();
    for (const word of unit.words) {
      await db.insert(schema.vocabWords).values({
        word: word.w, meaning: word.m, partOfSpeech: word.p,
        userId, unitId: unitRecord.id,
      });
    }
  }

  for (const res of SAMPLE_RESOURCES) {
    await db.insert(schema.teachingResources).values({
      ...res, userId, isSample: true,
    });
  }

  await db.insert(schema.lessonPlans).values([
    { title: "Unit 1 Reading: Explore the World", userId, classId: classIds[0], status: "completed", isSample: true, unit: "Unit 1", lessonType: "阅读课" },
    { title: "Unit 2 Listening: Improve Your Ability", userId, classId: classIds[1], status: "planning", isSample: true, unit: "Unit 2", lessonType: "听说课" },
    { title: "Unit 3 Writing: Protect the Environment", userId, classId: classIds[0], status: "pending", isSample: true, unit: "Unit 3", lessonType: "写作课" },
  ]);

  await db.insert(schema.teachingResearch).values([
    { title: "集体备课：Unit 1 教学设计", userId, type: "collective_planning", isSample: true, researchDate: "2026-09-15" },
    { title: "公开课评课：阅读教学策略", userId, type: "observation", isSample: true, researchDate: "2026-09-20" },
  ]);

  await db.insert(schema.homework).values([
    { title: "Unit 1 词汇练习", userId, classId: classIds[0], status: "published", isSample: true, assignDate: "2026-09-15", dueDate: "2026-09-20" },
    { title: "Unit 2 阅读理解", userId, classId: classIds[1], status: "published", isSample: true, assignDate: "2026-09-18", dueDate: "2026-09-25" },
    { title: "Unit 3 写作练习", userId, classId: classIds[0], status: "draft", isSample: true, assignDate: "2026-09-20", dueDate: "2026-09-27" },
  ]);

  const [exam] = await db.insert(schema.exams).values({
    name: "Unit 1-2 阶段测试", userId, classId: classIds[0], isSample: true, examDate: "2026-09-25",
  }).returning();

  const examStudents = await db.select().from(schema.students)
    .where(eq(schema.students.classId, classIds[0]));
  for (let i = 0; i < Math.min(3, examStudents.length); i++) {
    const s = examStudents[i];
    await db.insert(schema.examScores).values({
      examId: exam.id, studentId: s.id, userId,
      listeningScore: String(20 + i), speakingScore: String(18 + i), writtenScore: String(45 + i),
      totalIsManual: false,
    });
  }

  await db.insert(schema.dictationLists).values([
    { name: "Unit 1 听写", userId, classId: classIds[0], isSample: true, dictationDate: "2026-09-16" },
    { name: "Unit 2 听写", userId, classId: classIds[1], isSample: true, dictationDate: "2026-09-23" },
  ]);

  console.log("示例数据创建完成");
}

async function main() {
  const userId = process.env.SEED_USER_ID;
  if (!userId) {
    console.error("请设置 SEED_USER_ID 环境变量");
    process.exit(1);
  }
  await seedSampleData(userId);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
