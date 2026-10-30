import { describe, it, expect } from "vitest";
import {
  computeStudentScore,
  computeClassSummary,
  normalizePassRule,
  passRuleLabel,
  type PassRule,
} from "./scoring";

const NONE: PassRule = { type: "none", value: null };
const cellKey = (s: string, w: string) => `${s}:${w}`;

describe("computeStudentScore - 基础计数", () => {
  it("空词表返回零分且 none 状态", () => {
    const r = computeStudentScore([], {}, NONE);
    expect(r).toEqual({
      correctWeight: 0,
      totalWeight: 0,
      wrongCount: 0,
      recordedCount: 0,
      scorePct: null,
      status: "none",
    });
  });

  it("默认权重为 1：正确/错误/未批改分别计数", () => {
    const words = [
      { id: "a", scoreWeight: 1 },
      { id: "b", scoreWeight: 1 },
      { id: "c", scoreWeight: 1 },
      { id: "d", scoreWeight: 1 },
    ];
    const results = { a: true, b: false, c: true, d: null };
    const r = computeStudentScore(words, results, NONE);
    expect(r.correctWeight).toBe(2);
    expect(r.totalWeight).toBe(4);
    expect(r.wrongCount).toBe(1);
    expect(r.recordedCount).toBe(3);
    expect(r.scorePct).toBe(50);
    expect(r.status).toBe("none");
  });
});

describe("computeStudentScore - 加权得分", () => {
  it("正确词按 scoreWeight 累加，总分含所有词", () => {
    const words = [
      { id: "a", scoreWeight: 3 },
      { id: "b", scoreWeight: 2 },
      { id: "c", scoreWeight: 5 },
    ];
    const results = { a: true, b: false, c: true };
    const r = computeStudentScore(words, results, NONE);
    expect(r.correctWeight).toBe(8);
    expect(r.totalWeight).toBe(10);
    expect(r.scorePct).toBe(80);
  });

  it("非正权重视为 0，不贡献得分也不计入总分", () => {
    const words = [
      { id: "a", scoreWeight: 2 },
      { id: "b", scoreWeight: 0 },
      { id: "c", scoreWeight: -1 },
    ];
    const results = { a: true, b: true, c: true };
    const r = computeStudentScore(words, results, NONE);
    expect(r.correctWeight).toBe(2);
    expect(r.totalWeight).toBe(2);
    expect(r.scorePct).toBe(100);
  });
});

describe("computeStudentScore - 错词上限规则", () => {
  const words = [
    { id: "a", scoreWeight: 1 },
    { id: "b", scoreWeight: 1 },
    { id: "c", scoreWeight: 1 },
    { id: "d", scoreWeight: 1 },
  ];

  it("全批改且错词数 <= 上限 → pass", () => {
    const r = computeStudentScore(words, { a: true, b: false, c: true, d: true }, { type: "wrong", value: 1 });
    expect(r.wrongCount).toBe(1);
    expect(r.status).toBe("pass");
  });

  it("全批改且错词数 > 上限 → fail", () => {
    const r = computeStudentScore(words, { a: false, b: false, c: true, d: true }, { type: "wrong", value: 1 });
    expect(r.wrongCount).toBe(2);
    expect(r.status).toBe("fail");
  });

  it("有未批改格 → pending（即便错词已超限也先判待完成）", () => {
    const r = computeStudentScore(words, { a: false, b: false, c: true, d: null }, { type: "wrong", value: 1 });
    expect(r.status).toBe("pending");
  });
});

describe("computeStudentScore - 分数下限规则", () => {
  const words = [
    { id: "a", scoreWeight: 3 },
    { id: "b", scoreWeight: 2 },
    { id: "c", scoreWeight: 5 },
  ];

  it("全批改且得分率 >= 及格线 → pass", () => {
    const r = computeStudentScore(words, { a: true, b: true, c: false }, { type: "score", value: 50 });
    expect(r.scorePct).toBe(50);
    expect(r.status).toBe("pass");
  });

  it("全批改且得分率 < 及格线 → fail", () => {
    const r = computeStudentScore(words, { a: true, b: false, c: false }, { type: "score", value: 60 });
    expect(r.scorePct).toBe(30);
    expect(r.status).toBe("fail");
  });

  it("有未批改格 → pending", () => {
    const r = computeStudentScore(words, { a: true, b: true, c: null }, { type: "score", value: 60 });
    expect(r.status).toBe("pending");
  });
});

describe("computeClassSummary", () => {
  it("按学生数放大总分，聚合全班加权得分", () => {
    const words = [{ id: "a", scoreWeight: 2 }, { id: "b", scoreWeight: 3 }];
    const students = [{ id: "s1" }, { id: "s2" }];
    const results = {
      [cellKey("s1", "a")]: true,
      [cellKey("s1", "b")]: false,
      [cellKey("s2", "a")]: true,
      [cellKey("s2", "b")]: true,
    };
    const r = computeClassSummary(words, students, results, cellKey);
    expect(r.totalWeight).toBe(10);
    expect(r.correctWeight).toBe(7);
    expect(r.recordedCount).toBe(4);
    expect(r.avgPct).toBe(70);
  });

  it("无学生或无词表 → avgPct 为 null", () => {
    expect(computeClassSummary([], [{ id: "s1" }], {}, cellKey).avgPct).toBeNull();
    expect(computeClassSummary([{ id: "a", scoreWeight: 1 }], [], {}, cellKey).avgPct).toBeNull();
  });
});

describe("normalizePassRule", () => {
  it("合法 type 保留，非法回退 none", () => {
    expect(normalizePassRule("wrong", 2)).toEqual({ type: "wrong", value: 2 });
    expect(normalizePassRule("score", 60)).toEqual({ type: "score", value: 60 });
    expect(normalizePassRule("none", null)).toEqual({ type: "none", value: null });
    expect(normalizePassRule("xxx", 5)).toEqual({ type: "none", value: 5 });
    expect(normalizePassRule(null, undefined)).toEqual({ type: "none", value: null });
  });

  it("负数与非整数阈值被截断为非负整数", () => {
    expect(normalizePassRule("wrong", -1)).toEqual({ type: "wrong", value: 0 });
    expect(normalizePassRule("score", 59.7)).toEqual({ type: "score", value: 59 });
  });
});

describe("passRuleLabel", () => {
  it("三种规则的可读描述", () => {
    expect(passRuleLabel({ type: "none", value: null })).toBe("不评定");
    expect(passRuleLabel({ type: "wrong", value: 2 })).toBe("错词上限 2");
    expect(passRuleLabel({ type: "score", value: 60 })).toBe("分数下限 60");
  });
});
