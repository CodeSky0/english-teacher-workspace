import { Hono } from "hono";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { classes, students } from "@/db/schema/classes";
import { vocabUnits, vocabWords } from "@/db/schema/vocab";
import { dictationLists, dictationWords, dictationResults } from "@/db/schema/dictation";
import { classroomPoints, attendanceRecords, studentFeedback } from "@/db/schema/classroom";
import { buildXlsx, xlsxResponse, type SheetSpec } from "@/server/excel/workbook";
import { normalizeGender, genderLabel } from "@/lib/excel/fields";
import { badRequest, notFound, unprocessable } from "../errors";

const routes = new Hono<{ Variables: { user: { id: string }; session: any } }>();

const MAX_ROWS = 2000;
type ImportMode = "append" | "upsert";

function parseMode(value: unknown): ImportMode {
  return value === "upsert" ? "upsert" : "append";
}

/** 工作表名称限制：不超过 31 字符，且不含 \ / ? * [ ] : */
function safeSheetName(name: string, fallback: string): string {
  const cleaned = String(name ?? "").replace(/[\\/?*[\]:]/g, "-").trim();
  return (cleaned || fallback).slice(0, 31);
}

function toSeatNo(value: unknown): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function rate(correct: number, total: number): string {
  if (!total) return "—";
  return `${((correct / total) * 100).toFixed(1)}%`;
}

function level(correct: number, total: number): string {
  if (!total) return "—";
  const pct = (correct / total) * 100;
  if (pct >= 90) return "优秀";
  if (pct >= 80) return "良好";
  if (pct >= 60) return "合格";
  return "待加强";
}

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function str(value: unknown): string {
  return String(value ?? "").trim();
}

async function assertClass(classId: string, userId: string) {
  const [row] = await db
    .select()
    .from(classes)
    .where(and(eq(classes.id, classId), eq(classes.userId, userId), isNull(classes.deletedAt)));
  return row ?? null;
}

// ---------------------------------------------------------------- 导入：学生

routes.post("/import/students", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  if (!body) return unprocessable(c, "请求体不合法");

  const classId = str(body.classId);
  if (!classId) return badRequest(c, "请先选择要导入的班级");
  if (!(await assertClass(classId, user.id))) return notFound(c, "班级不存在");

  const rows: Record<string, string>[] = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) return badRequest(c, "没有可导入的数据");
  if (rows.length > MAX_ROWS) return unprocessable(c, `单次导入不能超过 ${MAX_ROWS} 行`);

  const mode = parseMode(body.mode);
  const existing = await db
    .select()
    .from(students)
    .where(and(eq(students.classId, classId), eq(students.userId, user.id), isNull(students.deletedAt)));

  const byNo = new Map<string, (typeof existing)[number]>();
  const byName = new Map<string, (typeof existing)[number]>();
  for (const s of existing) {
    if (s.studentNo) byNo.set(s.studentNo.trim(), s);
    byName.set(s.name.trim(), s);
  }

  type NewStudent = typeof students.$inferInsert;
  const inserts: NewStudent[] = [];
  const updates: { id: string; values: Partial<NewStudent> }[] = [];
  const errors: { index: number; message: string }[] = [];
  const seen = new Set<string>();
  let skipped = 0;

  rows.forEach((raw, i) => {
    const name = str(raw.name);
    if (!name) {
      errors.push({ index: i + 2, message: "姓名为空" });
      return;
    }
    const studentNo = str(raw.studentNo) || null;
    const dedupeKey = studentNo ? `no:${studentNo}` : `name:${name}`;
    if (seen.has(dedupeKey)) {
      skipped++;
      return;
    }
    seen.add(dedupeKey);

    const values: NewStudent = {
      userId: user.id,
      classId,
      name,
      enName: str(raw.enName) || null,
      gender: normalizeGender(raw.gender),
      studentNo,
      seatNo: toSeatNo(raw.seatNo),
    };

    const matched = (studentNo ? byNo.get(studentNo) : undefined) ?? byName.get(name);

    if (!matched) {
      inserts.push(values);
    } else if (mode === "upsert") {
      updates.push({ id: matched.id, values });
    } else {
      // 追加模式：已存在则跳过，避免产生重复档案
      skipped++;
    }
  });

  if (inserts.length) await db.insert(students).values(inserts);
  for (const u of updates) {
    await db
      .update(students)
      .set({ ...u.values, updatedAt: new Date() })
      .where(and(eq(students.id, u.id), eq(students.userId, user.id)));
  }

  return c.json({
    data: { created: inserts.length, updated: updates.length, skipped, errors, total: rows.length },
  });
});

// ---------------------------------------------------------------- 导入：单词

/** 解析目标单元：优先 unitId，其次按 unitName 查找，最后新建 */
async function resolveUnit(userId: string, unitId?: string, unitName?: string) {
  if (unitId) {
    const [row] = await db
      .select()
      .from(vocabUnits)
      .where(and(eq(vocabUnits.id, unitId), eq(vocabUnits.userId, userId), isNull(vocabUnits.deletedAt)));
    return row ?? null;
  }
  const name = str(unitName);
  if (!name) return null;
  const [found] = await db
    .select()
    .from(vocabUnits)
    .where(and(eq(vocabUnits.userId, userId), eq(vocabUnits.name, name), isNull(vocabUnits.deletedAt)));
  if (found) return found;
  const [created] = await db.insert(vocabUnits).values({ userId, name }).returning();
  return created;
}

type WordDiff = {
  inserts: Record<string, unknown>[];
  updates: { id: string; values: Record<string, unknown> }[];
  errors: { index: number; message: string }[];
  skipped: number;
};

/** 通用的「按单词去重」导入逻辑，词汇单元与听写词表复用 */
function diffWords(
  rows: Record<string, string>[],
  mode: ImportMode,
  existing: { id: string; word: string }[],
  buildValues: (raw: Record<string, string>) => Record<string, unknown>
): WordDiff {
  const byWord = new Map(existing.map((w) => [w.word.trim().toLowerCase(), w]));
  const inserts: Record<string, unknown>[] = [];
  const updates: { id: string; values: Record<string, unknown> }[] = [];
  const errors: { index: number; message: string }[] = [];
  const seen = new Set<string>();
  let skipped = 0;

  rows.forEach((raw, i) => {
    const word = str(raw.word);
    if (!word) {
      errors.push({ index: i + 2, message: "单词为空" });
      return;
    }
    const key = word.toLowerCase();
    if (seen.has(key)) {
      skipped++;
      return;
    }
    seen.add(key);

    const values = buildValues(raw);
    const matched = byWord.get(key);
    if (matched) {
      if (mode === "upsert") updates.push({ id: matched.id, values });
      else skipped++;
      return;
    }
    inserts.push(values);
  });

  return { inserts, updates, errors, skipped };
}

routes.post("/import/vocab", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  if (!body) return unprocessable(c, "请求体不合法");

  const rows: Record<string, string>[] = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) return badRequest(c, "没有可导入的数据");
  if (rows.length > MAX_ROWS) return unprocessable(c, `单次导入不能超过 ${MAX_ROWS} 行`);

  const unit = await resolveUnit(user.id, body.unitId ? str(body.unitId) : undefined, body.unitName);
  if (!unit) return badRequest(c, "请选择或填写词汇单元");

  const existing = await db
    .select({ id: vocabWords.id, word: vocabWords.word })
    .from(vocabWords)
    .where(and(eq(vocabWords.unitId, unit.id), eq(vocabWords.userId, user.id), isNull(vocabWords.deletedAt)));

  const { inserts, updates, errors, skipped } = diffWords(rows, parseMode(body.mode), existing, (raw) => ({
    userId: user.id,
    unitId: unit.id,
    word: str(raw.word),
    meaning: str(raw.meaning) || null,
    phoneticUs: str(raw.phoneticUs) || null,
    partOfSpeech: str(raw.partOfSpeech) || null,
    exampleEn: str(raw.exampleEn) || null,
    exampleZh: str(raw.exampleZh) || null,
  }));

  if (inserts.length) await db.insert(vocabWords).values(inserts as (typeof vocabWords.$inferInsert)[]);
  for (const u of updates) {
    await db
      .update(vocabWords)
      .set({ ...u.values, updatedAt: new Date() })
      .where(and(eq(vocabWords.id, u.id), eq(vocabWords.userId, user.id)));
  }

  return c.json({
    data: {
      unitId: unit.id,
      unitName: unit.name,
      created: inserts.length,
      updated: updates.length,
      skipped,
      errors,
      total: rows.length,
    },
  });
});

routes.post("/import/dictation-words", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  if (!body) return unprocessable(c, "请求体不合法");

  const listId = str(body.listId);
  if (!listId) return badRequest(c, "请先选择听写词表");
  const [list] = await db
    .select()
    .from(dictationLists)
    .where(and(eq(dictationLists.id, listId), eq(dictationLists.userId, user.id), isNull(dictationLists.deletedAt)));
  if (!list) return notFound(c, "听写词表不存在");

  const rows: Record<string, string>[] = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) return badRequest(c, "没有可导入的数据");
  if (rows.length > MAX_ROWS) return unprocessable(c, `单次导入不能超过 ${MAX_ROWS} 行`);

  const existing = await db
    .select({ id: dictationWords.id, word: dictationWords.word })
    .from(dictationWords)
    .where(and(eq(dictationWords.listId, listId), eq(dictationWords.userId, user.id), isNull(dictationWords.deletedAt)));

  const { inserts, updates, errors, skipped } = diffWords(rows, parseMode(body.mode), existing, (raw) => ({
    userId: user.id,
    listId,
    word: str(raw.word),
    meaning: str(raw.meaning) || null,
  }));

  if (inserts.length) await db.insert(dictationWords).values(inserts as (typeof dictationWords.$inferInsert)[]);
  for (const u of updates) {
    await db
      .update(dictationWords)
      .set({ ...u.values, updatedAt: new Date() })
      .where(and(eq(dictationWords.id, u.id), eq(dictationWords.userId, user.id)));
  }

  return c.json({
    data: { listId, created: inserts.length, updated: updates.length, skipped, errors, total: rows.length },
  });
});

// ---------------------------------------------------------------- 导出

routes.get("/export/students", async (c) => {
  const user = c.get("user");
  const classId = c.req.query("classId");
  const conditions = [eq(students.userId, user.id), isNull(students.deletedAt)];
  if (classId) conditions.push(eq(students.classId, classId));

  const rows = await db.select().from(students).where(and(...conditions));
  const classRows = await db
    .select({ id: classes.id, name: classes.name })
    .from(classes)
    .where(and(eq(classes.userId, user.id), isNull(classes.deletedAt)));
  const classNameById = new Map(classRows.map((r) => [r.id, r.name]));

  rows.sort((a, b) => {
    if (a.classId !== b.classId) return (classNameById.get(a.classId) ?? "").localeCompare(classNameById.get(b.classId) ?? "");
    const sa = a.seatNo ?? Number.MAX_SAFE_INTEGER;
    const sb = b.seatNo ?? Number.MAX_SAFE_INTEGER;
    if (sa !== sb) return sa - sb;
    return a.name.localeCompare(b.name, "zh-CN");
  });

  const sheet: SheetSpec = {
    name: "学生名单",
    headers: ["姓名", "英文名", "性别", "学号", "座位号", "班级"],
    rows: rows.map((s) => [
      s.name,
      s.enName ?? "",
      genderLabel(s.gender ?? "unknown"),
      s.studentNo ?? "",
      s.seatNo ?? "",
      classNameById.get(s.classId) ?? "",
    ]),
    widths: [14, 16, 8, 16, 10, 16],
  };

  const buffer = await buildXlsx([sheet]);
  return xlsxResponse(`学生名单_${today()}.xlsx`, buffer);
});

routes.get("/export/vocab", async (c) => {
  const user = c.get("user");
  const unitId = c.req.query("unitId");

  const unitRows = await db
    .select({ id: vocabUnits.id, name: vocabUnits.name })
    .from(vocabUnits)
    .where(
      unitId
        ? and(eq(vocabUnits.id, unitId), eq(vocabUnits.userId, user.id), isNull(vocabUnits.deletedAt))
        : and(eq(vocabUnits.userId, user.id), isNull(vocabUnits.deletedAt))
    );
  const unitNameById = new Map(unitRows.map((u) => [u.id, u.name]));

  const conditions = [eq(vocabWords.userId, user.id), isNull(vocabWords.deletedAt)];
  if (unitId) conditions.push(eq(vocabWords.unitId, unitId));
  const words = await db.select().from(vocabWords).where(and(...conditions));

  const baseHeaders = ["单词", "音标", "词性", "释义", "英文例句", "中文例句"];
  const headers = unitId ? baseHeaders : ["单元", ...baseHeaders];
  const sheetName = unitId ? safeSheetName(unitNameById.get(unitId) ?? "", "词汇表") : "词汇表";

  const sheet: SheetSpec = {
    name: sheetName,
    headers,
    rows: words.map((w) => {
      const rest: (string | number)[] = [
        w.word,
        w.phoneticUs ?? "",
        w.partOfSpeech ?? "",
        w.meaning ?? "",
        w.exampleEn ?? "",
        w.exampleZh ?? "",
      ];
      return unitId ? rest : [unitNameById.get(w.unitId) ?? "", ...rest];
    }),
    widths: unitId ? [16, 18, 10, 24, 34, 34] : [16, 16, 18, 10, 24, 34, 34],
  };

  const buffer = await buildXlsx([sheet]);
  return xlsxResponse(`${sheetName}_${today()}.xlsx`, buffer);
});

/** 单次听写成绩：汇总 + 明细两个工作表 */
routes.get("/export/dictation/:listId", async (c) => {
  const user = c.get("user");
  const listId = c.req.param("listId");

  const [list] = await db
    .select()
    .from(dictationLists)
    .where(and(eq(dictationLists.id, listId), eq(dictationLists.userId, user.id), isNull(dictationLists.deletedAt)));
  if (!list) return notFound(c, "听写词表不存在");

  const words = await db
    .select()
    .from(dictationWords)
    .where(and(eq(dictationWords.listId, listId), eq(dictationWords.userId, user.id), isNull(dictationWords.deletedAt)));

  const studentConditions = [eq(students.userId, user.id), isNull(students.deletedAt)];
  if (list.classId) studentConditions.push(eq(students.classId, list.classId));
  const studentRows = await db.select().from(students).where(and(...studentConditions));
  studentRows.sort((a, b) => {
    const sa = a.seatNo ?? Number.MAX_SAFE_INTEGER;
    const sb = b.seatNo ?? Number.MAX_SAFE_INTEGER;
    if (sa !== sb) return sa - sb;
    return a.name.localeCompare(b.name, "zh-CN");
  });

  const results = await db
    .select()
    .from(dictationResults)
    .where(and(eq(dictationResults.listId, listId), eq(dictationResults.userId, user.id), isNull(dictationResults.deletedAt)));
  const resultMap = new Map<string, boolean | null>();
  for (const r of results) resultMap.set(`${r.studentId}:${r.wordId}`, r.isCorrect);

  const summaryRows: (string | number)[][] = [];
  const detailRows: (string | number)[][] = [];

  for (const st of studentRows) {
    let correct = 0;
    let recorded = 0;
    const wrong: string[] = [];
    const cells: (string | number)[] = [];
    for (const w of words) {
      const v = resultMap.get(`${st.id}:${w.id}`);
      if (v === true) {
        correct++;
        recorded++;
        cells.push("✓");
      } else if (v === false) {
        recorded++;
        cells.push("✗");
        wrong.push(w.word);
      } else {
        cells.push("");
      }
    }
    // 未批改的学生不按 0% 计算，避免拉低班级统计
    summaryRows.push([
      st.name,
      st.studentNo ?? "",
      correct,
      words.length,
      recorded ? rate(correct, recorded) : "未批改",
      recorded ? level(correct, recorded) : "未批改",
      wrong.join("、"),
    ]);
    detailRows.push([st.name, st.studentNo ?? "", ...cells]);
  }

  const buffer = await buildXlsx([
    {
      name: "成绩汇总",
      headers: ["姓名", "学号", "正确数", "总词数", "正确率", "等级", "错误单词"],
      rows: summaryRows,
      widths: [14, 16, 10, 10, 10, 10, 40],
    },
    {
      name: "明细",
      headers: ["姓名", "学号", ...words.map((w) => w.word)],
      rows: detailRows,
      widths: [14, 16, ...words.map(() => 10)],
    },
  ]);

  return xlsxResponse(`听写成绩_${safeSheetName(list.name, "词表")}_${today()}.xlsx`, buffer);
});

/** 班级历次听写正确率汇总 */
routes.get("/export/dictation-summary", async (c) => {
  const user = c.get("user");
  const classId = c.req.query("classId");
  if (!classId) return badRequest(c, "缺少 classId");
  if (!(await assertClass(classId, user.id))) return notFound(c, "班级不存在");

  const lists = await db
    .select()
    .from(dictationLists)
    .where(and(eq(dictationLists.classId, classId), eq(dictationLists.userId, user.id), isNull(dictationLists.deletedAt)));
  if (lists.length === 0) return unprocessable(c, "该班级还没有听写词表");
  lists.sort((a, b) => (a.dictationDate ?? "").localeCompare(b.dictationDate ?? "") || a.name.localeCompare(b.name, "zh-CN"));

  const studentRows = await db
    .select()
    .from(students)
    .where(and(eq(students.classId, classId), eq(students.userId, user.id), isNull(students.deletedAt)));

  const listIds = lists.map((l) => l.id);
  const results = await db
    .select()
    .from(dictationResults)
    .where(and(eq(dictationResults.userId, user.id), inArray(dictationResults.listId, listIds), isNull(dictationResults.deletedAt)));

  const correctMap = new Map<string, number>();
  const recordedMap = new Map<string, number>();
  for (const r of results) {
    const k = `${r.listId}:${r.studentId}`;
    recordedMap.set(k, (recordedMap.get(k) ?? 0) + 1);
    if (r.isCorrect === true) correctMap.set(k, (correctMap.get(k) ?? 0) + 1);
  }

  const rows: (string | number)[][] = studentRows.map((st) => {
    const cells: (string | number)[] = [];
    let sum = 0;
    let counted = 0;
    for (const l of lists) {
      const recorded = recordedMap.get(`${l.id}:${st.id}`) ?? 0;
      const correct = correctMap.get(`${l.id}:${st.id}`) ?? 0;
      if (recorded) {
        cells.push(rate(correct, recorded));
        sum += correct / recorded;
        counted++;
      } else {
        cells.push("—");
      }
    }
    return [st.name, st.studentNo ?? "", ...cells, counted ? `${((sum / counted) * 100).toFixed(1)}%` : "—"];
  });

  const buffer = await buildXlsx([
    {
      name: "历次听写",
      headers: ["姓名", "学号", ...lists.map((l) => l.name), "平均正确率"],
      rows,
      widths: [14, 16, ...lists.map(() => 12), 12],
    },
  ]);
  return xlsxResponse(`历次听写汇总_${today()}.xlsx`, buffer);
});

// ---------------------------------------------------------------- 导出：错词本

/** 班级错词本：按出错人次倒序，用于生成复习单 */
routes.get("/export/wrong-words", async (c) => {
  const user = c.get("user");
  const classId = str(c.req.query("classId"));
  const minCount = Math.max(1, Number(c.req.query("minCount") ?? 1) || 1);
  const limit = Math.min(Math.max(Number(c.req.query("limit") ?? 100) || 100, 1), 500);

  const listConditions = [eq(dictationLists.userId, user.id), isNull(dictationLists.deletedAt)];
  if (classId) {
    if (!(await assertClass(classId, user.id))) return notFound(c, "班级不存在");
    listConditions.push(eq(dictationLists.classId, classId));
  }
  const lists = await db.select().from(dictationLists).where(and(...listConditions));
  if (lists.length === 0) return unprocessable(c, "还没有听写词表");

  const listIds = lists.map((l) => l.id);
  const listNameById = new Map(lists.map((l) => [l.id, l.name]));
  const listDateById = new Map(lists.map((l) => [l.id, l.dictationDate ?? ""]));

  const words = await db
    .select()
    .from(dictationWords)
    .where(and(eq(dictationWords.userId, user.id), inArray(dictationWords.listId, listIds), isNull(dictationWords.deletedAt)));
  const wordById = new Map(words.map((w) => [w.id, w]));

  const results = await db
    .select()
    .from(dictationResults)
    .where(and(eq(dictationResults.userId, user.id), inArray(dictationResults.listId, listIds), isNull(dictationResults.deletedAt)));

  type Bucket = { word: string; meaning: string; wrong: number; recorded: number; students: Set<string>; lastDate: string; listNames: Set<string> };
  const buckets = new Map<string, Bucket>();

  for (const r of results) {
    const w = wordById.get(r.wordId);
    if (!w) continue;
    const key = w.word.trim().toLowerCase();
    let b = buckets.get(key);
    if (!b) {
      b = { word: w.word, meaning: w.meaning ?? "", wrong: 0, recorded: 0, students: new Set(), lastDate: "", listNames: new Set() };
      buckets.set(key, b);
    }
    b.recorded++;
    if (r.isCorrect === false) {
      b.wrong++;
      b.students.add(r.studentId);
      const d = listDateById.get(r.listId) ?? "";
      if (d > b.lastDate) b.lastDate = d;
      const n = listNameById.get(r.listId);
      if (n) b.listNames.add(n);
    }
  }

  const rows: (string | number)[][] = [...buckets.values()]
    .filter((b) => b.wrong >= minCount)
    .sort((a, b) => b.wrong - a.wrong || a.word.localeCompare(b.word))
    .slice(0, limit)
    .map((b) => [
      b.word,
      b.meaning,
      b.wrong,
      b.recorded,
      rate(b.wrong, b.recorded),
      b.students.size,
      b.lastDate,
      [...b.listNames].join("、"),
    ]);

  if (rows.length === 0) return unprocessable(c, "没有符合条件的错词");

  const buffer = await buildXlsx([
    {
      name: "错词本",
      headers: ["单词", "释义", "出错次数", "听写次数", "出错率", "出错人数", "最近出错日期", "来源词表"],
      rows,
      widths: [18, 26, 10, 10, 10, 10, 14, 30],
    },
  ]);
  return xlsxResponse(`错词本_${today()}.xlsx`, buffer);
});

// ---------------------------------------------------------------- 导出：课堂表现

/** 课堂积分与考勤汇总，用于阶段性评价 */
routes.get("/export/classroom", async (c) => {
  const user = c.get("user");
  const classId = str(c.req.query("classId"));
  if (!classId) return badRequest(c, "缺少 classId");
  if (!(await assertClass(classId, user.id))) return notFound(c, "班级不存在");

  const studentRows = await db
    .select()
    .from(students)
    .where(and(eq(students.classId, classId), eq(students.userId, user.id), isNull(students.deletedAt)));
  studentRows.sort((a, b) => {
    const sa = a.seatNo ?? Number.MAX_SAFE_INTEGER;
    const sb = b.seatNo ?? Number.MAX_SAFE_INTEGER;
    if (sa !== sb) return sa - sb;
    return a.name.localeCompare(b.name, "zh-CN");
  });

  const points = await db
    .select()
    .from(classroomPoints)
    .where(and(eq(classroomPoints.classId, classId), eq(classroomPoints.userId, user.id), isNull(classroomPoints.deletedAt)));
  const attendance = await db
    .select()
    .from(attendanceRecords)
    .where(and(eq(attendanceRecords.classId, classId), eq(attendanceRecords.userId, user.id), isNull(attendanceRecords.deletedAt)));
  const feedback = await db
    .select()
    .from(studentFeedback)
    .where(and(eq(studentFeedback.classId, classId), eq(studentFeedback.userId, user.id), isNull(studentFeedback.deletedAt)));

  const pointsByStudent = new Map<string, number>();
  for (const p of points) pointsByStudent.set(p.studentId, (pointsByStudent.get(p.studentId) ?? 0) + (p.points ?? 0));

  const attByStudent = new Map<string, Record<string, number>>();
  for (const a of attendance) {
    const cur = attByStudent.get(a.studentId) ?? {};
    cur[a.status] = (cur[a.status] ?? 0) + 1;
    attByStudent.set(a.studentId, cur);
  }

  const fbByStudent = new Map<string, Record<string, number>>();
  for (const f of feedback) {
    const cur = fbByStudent.get(f.studentId) ?? {};
    cur[f.type] = (cur[f.type] ?? 0) + 1;
    fbByStudent.set(f.studentId, cur);
  }

  const rows: (string | number)[][] = studentRows.map((st) => {
    const att = attByStudent.get(st.id) ?? {};
    const fb = fbByStudent.get(st.id) ?? {};
    return [
      st.name,
      st.studentNo ?? "",
      pointsByStudent.get(st.id) ?? 0,
      att.present ?? 0,
      att.late ?? 0,
      att.leave ?? 0,
      att.absent ?? 0,
      fb.positive ?? 0,
      fb.negative ?? 0,
    ];
  });

  const buffer = await buildXlsx([
    {
      name: "课堂表现",
      headers: ["姓名", "学号", "累计积分", "出勤", "迟到", "请假", "缺勤", "表扬", "待改进"],
      rows,
      widths: [14, 16, 10, 8, 8, 8, 8, 8, 8],
    },
  ]);
  return xlsxResponse(`课堂表现_${today()}.xlsx`, buffer);
});

export { routes as importExportRoutes };
