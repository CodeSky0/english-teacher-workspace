import { describe, it, expect } from "vitest";
import {
  STUDENT_FIELDS,
  VOCAB_WORD_FIELDS,
  matchField,
  mapRow,
  normalizeGender,
  normalizeHeader,
} from "./fields";

describe("normalizeHeader", () => {
  it("去除空格、括号并转小写", () => {
    expect(normalizeHeader(" 英文 Name ")).toBe("英文name");
    expect(normalizeHeader("学号（必填）")).toBe("学号必填");
  });
});

describe("matchField", () => {
  it("识别中文表头", () => {
    expect(matchField("姓名", STUDENT_FIELDS)).toBe("name");
    expect(matchField("座位号", STUDENT_FIELDS)).toBe("seatNo");
  });

  it("识别英文表头且忽略大小写与空格", () => {
    expect(matchField("English Name", STUDENT_FIELDS)).toBe("enName");
    expect(matchField("student_no", STUDENT_FIELDS)).toBe("studentNo");
  });

  it("识别带括号说明的表头", () => {
    expect(matchField("姓名（必填）", STUDENT_FIELDS)).toBe("name");
  });

  it("未识别时返回 null", () => {
    expect(matchField("备注", STUDENT_FIELDS)).toBeNull();
    expect(matchField("", STUDENT_FIELDS)).toBeNull();
  });
});

describe("mapRow", () => {
  it("映射完整行", () => {
    const { row, missing } = mapRow({ 姓名: "张三", 性别: "男", 学号: "001" }, STUDENT_FIELDS);
    expect(row.name).toBe("张三");
    expect(row.gender).toBe("男");
    expect(row.studentNo).toBe("001");
    expect(row.seatNo).toBe("");
    expect(missing).toEqual([]);
  });

  it("必填缺失时给出提示", () => {
    const { missing } = mapRow({ 学号: "001" }, STUDENT_FIELDS);
    expect(missing).toEqual(["姓名"]);
  });

  it("同一字段重复时取第一个非空值", () => {
    const { row } = mapRow({ Name: "Tom", name: "" }, STUDENT_FIELDS);
    expect(row.name).toBe("Tom");
  });

  it("词汇字段映射", () => {
    const { row, missing } = mapRow({ 单词: "apple", 释义: "苹果" }, VOCAB_WORD_FIELDS);
    expect(row.word).toBe("apple");
    expect(row.meaning).toBe("苹果");
    expect(missing).toEqual([]);
  });
});

describe("normalizeGender", () => {
  it("中英文都能识别", () => {
    expect(normalizeGender("男")).toBe("male");
    expect(normalizeGender("Female")).toBe("female");
    expect(normalizeGender("M")).toBe("male");
    expect(normalizeGender("F")).toBe("female");
  });

  it("未知值回落为 unknown", () => {
    expect(normalizeGender("")).toBe("unknown");
    expect(normalizeGender("未知")).toBe("unknown");
  });
});
