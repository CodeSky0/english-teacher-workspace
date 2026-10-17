import ExcelJS from "exceljs";

/** 单元格值 -> 纯文本（处理富文本、公式、日期、超链接等） */
type RichTextRun = { text?: string };
type CellValueObject = {
  result?: unknown;
  richText?: RichTextRun[];
  text?: string;
  hyperlink?: string;
  error?: unknown;
};

export function cellToText(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  if (typeof value === "object") {
    const obj = value as CellValueObject | unknown[];
    if (Array.isArray(obj)) return obj.map(cellToText).join("");
    if ("result" in obj && obj.result != null && obj.result !== "") {
      return cellToText(obj.result);
    }
    if (Array.isArray(obj.richText)) {
      return obj.richText.map((r) => r.text ?? "").join("");
    }
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.hyperlink === "string" && !obj.text) return obj.hyperlink;
    if ("error" in obj) return "";
    return "";
  }
  return String(value).trim();
}

export type RawSheet = {
  sheetName: string;
  headers: string[];
  rows: Record<string, string>[];
  /** 原始二维数组，便于前端原样预览 */
  rawRows: string[][];
};

/**
 * 读取工作簿的第一个工作表，以第一行非空行为表头。
 * 同时兼容 .csv 文本（exceljs 读不了，交给调用方预处理）。
 */
export async function readFirstSheet(buffer: ArrayBuffer | Uint8Array): Promise<RawSheet> {
  const wb = new ExcelJS.Workbook();
  const buf = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  await wb.xlsx.load(buf as unknown as ArrayBuffer);

  const ws = wb.worksheets[0];
  if (!ws) throw new Error("文件内没有工作表");

  const rawRows: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const values: string[] = [];
    const rowValues = Array.isArray(row.values) ? row.values : [];
    // row.values 从下标 1 开始
    for (let i = 1; i < rowValues.length; i++) values.push(cellToText(rowValues[i]));
    if (values.some((v) => v !== "")) rawRows.push(values);
  });

  if (rawRows.length === 0) return { sheetName: ws.name, headers: [], rows: [], rawRows };

  const headers = rawRows[0].map((h) => String(h).trim());
  const rows = rawRows.slice(1).map((values) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (!h) return;
      // 同一表头重复时保留第一个非空值
      if (obj[h] === undefined || obj[h] === "") obj[h] = values[i] ?? "";
    });
    return obj;
  });

  return { sheetName: ws.name, headers, rows, rawRows };
}

export type SheetSpec = {
  name: string;
  headers: string[];
  rows: (string | number | null)[][];
  widths?: number[];
};

/** 生成 xlsx 文件（Node 环境） */
export async function buildXlsx(sheets: SheetSpec[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "英语教师工作台";
  wb.created = new Date();

  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name, {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    const headerRow = ws.addRow(sheet.headers);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: "middle" };
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF1F5F9" },
      };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      };
    });

    for (const row of sheet.rows) {
      ws.addRow(row.map((v) => (v === null || v === undefined ? "" : v)));
    }

    const widths = sheet.widths ?? sheet.headers.map((h) => Math.max(10, Math.min(40, h.length * 2 + 6)));
    widths.forEach((w, i) => {
      ws.getColumn(i + 1).width = w;
    });

    if (sheet.rows.length > 0) {
      ws.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: sheet.headers.length },
      };
    }
  }

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** 生成带下载头的 Response */
export function xlsxResponse(filename: string, buffer: Buffer): Response {
  const encoded = encodeURIComponent(filename);
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": XLSX_MIME,
      "Content-Disposition": `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`,
      "Cache-Control": "no-store",
    },
  });
}
