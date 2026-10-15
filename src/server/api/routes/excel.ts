import { Hono } from "hono";
import { fieldsFor, mapRow, matchField, type ImportKind } from "@/lib/excel/fields";
import { parseCSV } from "@/lib/csv";
import { readFirstSheet, buildXlsx, xlsxResponse, type SheetSpec } from "@/server/excel/workbook";
import { badRequest, unprocessable } from "../errors";

const routes = new Hono<{ Variables: { user: { id: string }; session: any } }>();

const KINDS: ImportKind[] = ["students", "vocab", "dictation-words"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function kindLabel(kind: ImportKind): string {
  return kind === "students" ? "学生名单" : kind === "vocab" ? "词汇表" : "听写词表";
}

function toKind(value: string | undefined): ImportKind | null {
  if (!value) return null;
  return KINDS.includes(value as ImportKind) ? (value as ImportKind) : null;
}

/** 下载导入模板 */
routes.get("/template", async (c) => {
  const kind = toKind(c.req.query("kind"));
  if (!kind) return badRequest(c, "缺少或不支持的 kind 参数（students / vocab / dictation-words）");

  const fields = fieldsFor(kind);
  const sheet: SheetSpec = {
    name: kindLabel(kind),
    headers: fields.map((f) => (f.required ? `${f.label} *` : f.label)),
    rows: [
      fields.map((f) => f.example ?? ""),
      fields.map((f) => (f.key === "name" ? "李小红" : f.key === "word" ? "library" : f.key === "gender" ? "女" : f.key === "studentNo" ? "20240102" : f.key === "seatNo" ? "2" : f.key === "meaning" ? "图书馆" : "")),
    ],
    widths: fields.map(() => 16),
  };

  const buffer = await buildXlsx([sheet]);
  return xlsxResponse(`${kindLabel(kind)}_导入模板.xlsx`, buffer);
});

/** 解析上传的 Excel，返回规范化预览数据（不写库） */
routes.post("/parse", async (c) => {
  const kind = toKind(c.req.query("kind"));
  if (!kind) return badRequest(c, "缺少或不支持的 kind 参数（students / vocab / dictation-words）");

  const body = await c.req.parseBody().catch(() => null);
  const file = body?.["file"];
  if (!file || typeof file === "string") return badRequest(c, "请上传文件");
  const upload = file as File;

  if (upload.size === 0) return badRequest(c, "文件内容为空");
  if (upload.size > MAX_SIZE) return unprocessable(c, "文件超过 5MB，请拆分后再导入");

  const name = (upload.name || "").toLowerCase();
  const fields = fieldsFor(kind);

  let headers: string[] = [];
  let rawRows: Record<string, string>[] = [];
  let sheetName = "";

  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    headers = fields.map((f) => f.label);
    const text = await upload.text();
    rawRows = parseCSV(text);
    sheetName = upload.name;
  } else if (name.endsWith(".xls")) {
    return unprocessable(c, "不支持旧版 .xls 格式，请在 Excel 中另存为 .xlsx 后重试");
  } else {
    const buffer = await upload.arrayBuffer();
    const sheet = await readFirstSheet(buffer).catch(() => null);
    if (!sheet) return unprocessable(c, "无法读取该文件，请确认是有效的 .xlsx 文件");
    headers = sheet.headers;
    rawRows = sheet.rows;
    sheetName = sheet.sheetName;
  }

  if (headers.filter(Boolean).length === 0) return unprocessable(c, "未识别到表头，请使用模板填写");

  const matchedKeys = new Set(
    headers.map((h) => matchField(h, fields)).filter((k): k is string => !!k)
  );
  const columns = fields.map((f) => ({
    key: f.key,
    label: f.label,
    required: !!f.required,
    matched: matchedKeys.has(f.key),
  }));
  // 未被识别的列，方便用户发现自己写错了表头
  const unknownHeaders = headers.filter((h) => h && !matchField(h, fields));

  const rows = rawRows.map((raw, i) => {
    const { row, missing } = mapRow(raw, fields);
    const errors = missing.map((m) => `缺少「${m}」`);
    return { index: i + 2, values: row, errors };
  });

  if (!columns.some((c2) => c2.matched)) {
    return unprocessable(
      c,
      `未识别到任何有效列，请参照模板填写表头（${fields.map((f) => f.label).join("、")}）`
    );
  }

  const validCount = rows.filter((r) => r.errors.length === 0).length;

  return c.json({
    data: {
      sheetName,
      headers,
      unknownHeaders,
      columns,
      rows,
      total: rows.length,
      validCount,
      errorCount: rows.length - validCount,
    },
  });
});

export { routes as excelRoutes };
