import { describe, it, expect } from "vitest";
import { buildCSV, parseCSV, csvEscape, download, sanitizeCSVValue } from "./index";

describe("CSV Utilities", () => {
  describe("csvEscape", () => {
    it("should escape values with commas", () => {
      expect(csvEscape("a,b")).toBe('"a,b"');
    });
    it("should escape values with quotes", () => {
      expect(csvEscape('a"b')).toBe('"a""b"');
    });
    it("should not escape simple values", () => {
      expect(csvEscape("hello")).toBe("hello");
    });
  });

  describe("buildCSV", () => {
    it("should start with BOM", () => {
      const csv = buildCSV(["a"], [{ a: "1" }]);
      expect(csv.charCodeAt(0)).toBe(0xfeff);
    });
    it("should use CRLF line endings", () => {
      const csv = buildCSV(["a", "b"], [{ a: "1", b: "2" }]);
      expect(csv).toContain("\r\n");
    });
    it("should build correct CSV", () => {
      const csv = buildCSV(["姓名", "学号"], [{ "姓名": "张三", "学号": "001" }]);
      const lines = csv.slice(1).split("\r\n").filter((l) => l);
      expect(lines[0]).toBe("姓名,学号");
      expect(lines[1]).toBe("张三,001");
    });
  });

  describe("parseCSV", () => {
    it("should parse simple CSV", () => {
      const rows = parseCSV("name,age\nJohn,25\nJane,30");
      expect(rows).toHaveLength(2);
      expect(rows[0].name).toBe("John");
      expect(rows[0].age).toBe("25");
    });
    it("should handle BOM", () => {
      const rows = parseCSV("\uFEFFname,age\nJohn,25");
      expect(rows[0].name).toBe("John");
    });
    it("should handle quoted values with commas", () => {
      const rows = parseCSV('name,desc\n"Smith, John",test');
      expect(rows[0].name).toBe("Smith, John");
    });
    it("should handle quoted values with quotes", () => {
      const rows = parseCSV('name,desc\n"Say ""hi""",test');
      expect(rows[0].name).toBe('Say "hi"');
    });
    it("should handle CRLF", () => {
      const rows = parseCSV("name,age\r\nJohn,25\r\nJane,30");
      expect(rows).toHaveLength(2);
    });
    it("should handle tab delimiter", () => {
      const rows = parseCSV("name\tage\nJohn\t25");
      expect(rows[0].name).toBe("John");
      expect(rows[0].age).toBe("25");
    });
    it("should skip empty rows", () => {
      const rows = parseCSV("name,age\nJohn,25\n,\nJane,30");
      expect(rows).toHaveLength(2);
    });
  });

  describe("sanitizeCSVValue", () => {
    it("should neutralize formula injection", () => {
      expect(sanitizeCSVValue("=SUM(A1)")).toBe("'=SUM(A1)");
      expect(sanitizeCSVValue("+1+1")).toBe("'+1+1");
      expect(sanitizeCSVValue("-1-1")).toBe("'-1-1");
      expect(sanitizeCSVValue("@cmd")).toBe("'@cmd");
    });
    it("should not modify safe values", () => {
      expect(sanitizeCSVValue("hello")).toBe("hello");
    });
  });
});
