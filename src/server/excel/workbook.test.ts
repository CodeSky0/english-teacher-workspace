import { describe, it, expect } from "vitest";
import { buildXlsx, readFirstSheet, cellToText } from "./workbook";

describe("cellToText", () => {
  it("处理普通值与空值", () => {
    expect(cellToText("abc")).toBe("abc");
    expect(cellToText(null)).toBe("");
    expect(cellToText(undefined)).toBe("");
    expect(cellToText(12)).toBe("12");
  });

  it("处理日期", () => {
    expect(cellToText(new Date(2024, 0, 5))).toBe("2024-01-05");
  });

  it("处理公式结果", () => {
    expect(cellToText({ formula: "A1+1", result: 3 })).toBe("3");
  });

  it("处理富文本", () => {
    expect(cellToText({ richText: [{ text: "hello " }, { text: "world" }] })).toBe("hello world");
  });
});

describe("buildXlsx + readFirstSheet", () => {
  it("写入后可读回相同内容（含中文表头）", async () => {
    const buffer = await buildXlsx([
      {
        name: "学生名单",
        headers: ["姓名", "学号", "座位号"],
        rows: [
          ["张小明", "20240101", 1],
          ["李小红", "20240102", 2],
        ],
      },
    ]);

    const sheet = await readFirstSheet(new Uint8Array(buffer));
    expect(sheet.sheetName).toBe("学生名单");
    expect(sheet.headers).toEqual(["姓名", "学号", "座位号"]);
    expect(sheet.rows).toEqual([
      { 姓名: "张小明", 学号: "20240101", 座位号: "1" },
      { 姓名: "李小红", 学号: "20240102", 座位号: "2" },
    ]);
  });

  it("跳过空行", async () => {
    const buffer = await buildXlsx([
      { name: "词表", headers: ["单词", "释义"], rows: [["apple", "苹果"], ["", ""]] },
    ]);
    const sheet = await readFirstSheet(new Uint8Array(buffer));
    expect(sheet.rows).toEqual([{ 单词: "apple", 释义: "苹果" }]);
  });

  it("支持多个工作表", async () => {
    const buffer = await buildXlsx([
      { name: "汇总", headers: ["姓名"], rows: [["张三"]] },
      { name: "明细", headers: ["单词"], rows: [["book"]] },
    ]);
    const sheet = await readFirstSheet(new Uint8Array(buffer));
    expect(sheet.sheetName).toBe("汇总");
  });
});
