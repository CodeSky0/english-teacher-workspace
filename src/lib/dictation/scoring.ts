/**
 * 听写加权得分与「过不过」判定的纯函数。
 *
 * - 输入只依赖原始数据（词表 + 每格批改结果 + 规则），无副作用、可单测。
 * - 与成绩页、导出汇总共用，保证前端展示与 Excel 口径一致。
 */

export type PassType = "none" | "wrong" | "score";

export type PassRule = {
  type: PassType;
  /** wrong 时为允许错的最大个数，score 时为百分制及格线；none 时忽略 */
  value: number | null;
};

export type ScoredWord = {
  id: string;
  scoreWeight: number;
};

/** 单格批改结果：true=对 / false=错 / null=未批改 */
export type CellValue = boolean | null;

export type StudentScoreStatus = "none" | "pending" | "pass" | "fail";

export type StudentScore = {
  /** 加权正确分（每个正确词贡献其 scoreWeight） */
  correctWeight: number;
  /** 总分（所有词的 scoreWeight 之和） */
  totalWeight: number;
  /** 错词个数 */
  wrongCount: number;
  /** 已批改格数（对+错） */
  recordedCount: number;
  /** 百分制得分率（0-100），totalWeight=0 或 recordedCount=0 时为 null */
  scorePct: number | null;
  /** 是否及格 / 待完成 / 不评定 */
  status: StudentScoreStatus;
};

/**
 * 计算单名学生的加权得分与及格状态。
 *
 * @param words 词表（含 scoreWeight）
 * @param results 以 wordId 为键的批改结果，缺失视为未批改
 * @param passRule 过不过规则
 */
export function computeStudentScore(
  words: ScoredWord[],
  results: Record<string, CellValue>,
  passRule: PassRule
): StudentScore {
  let correctWeight = 0;
  let totalWeight = 0;
  let wrongCount = 0;
  let recordedCount = 0;

  for (const w of words) {
    const weight = Number.isFinite(w.scoreWeight) && w.scoreWeight > 0 ? w.scoreWeight : 0;
    totalWeight += weight;
    const v = results[w.id] ?? null;
    if (v === true) {
      correctWeight += weight;
      recordedCount++;
    } else if (v === false) {
      wrongCount++;
      recordedCount++;
    }
  }

  const scorePct =
    totalWeight > 0 && recordedCount > 0 ? (correctWeight / totalWeight) * 100 : null;

  let status: StudentScoreStatus;
  if (passRule.type === "none") {
    status = "none";
  } else if (recordedCount < words.length) {
    status = "pending";
  } else if (passRule.type === "wrong") {
    const limit = passRule.value ?? 0;
    status = wrongCount <= limit ? "pass" : "fail";
  } else {
    const limit = passRule.value ?? 0;
    status = (scorePct ?? 0) >= limit ? "pass" : "fail";
  }

  return { correctWeight, totalWeight, wrongCount, recordedCount, scorePct, status };
}

/** 班级汇总：按加权口径聚合 */
export function computeClassSummary(
  words: ScoredWord[],
  students: { id: string }[],
  results: Record<string, CellValue>,
  cellKey: (studentId: string, wordId: string) => string
): {
  correctWeight: number;
  totalWeight: number;
  recordedCount: number;
  /** 全班加权平均得分率（0-100） */
  avgPct: number | null;
} {
  let correctWeight = 0;
  let totalWeight = 0;
  let recordedCount = 0;

  for (const w of words) {
    const weight = Number.isFinite(w.scoreWeight) && w.scoreWeight > 0 ? w.scoreWeight : 0;
    totalWeight += weight * students.length;
    for (const s of students) {
      const v = results[cellKey(s.id, w.id)] ?? null;
      if (v === true) {
        correctWeight += weight;
        recordedCount++;
      } else if (v === false) {
        recordedCount++;
      }
    }
  }

  const avgPct = totalWeight > 0 && recordedCount > 0 ? (correctWeight / totalWeight) * 100 : null;
  return { correctWeight, totalWeight, recordedCount, avgPct };
}

/** 把 passType/passValue 规范化为 PassRule（兜底非法值） */
export function normalizePassRule(type: string | null | undefined, value: number | null | undefined): PassRule {
  const t: PassType = type === "wrong" || type === "score" ? type : "none";
  const v = Number.isFinite(value as number) ? Math.max(0, Math.trunc(value as number)) : null;
  return { type: t, value: v };
}

/** 规则的人类可读描述 */
export function passRuleLabel(rule: PassRule): string {
  if (rule.type === "none") return "不评定";
  if (rule.type === "wrong") return `错词上限 ${rule.value ?? 0}`;
  return `分数下限 ${rule.value ?? 0}`;
}
