import { apiClient } from "@/lib/api-client";
import type { ImportKind } from "./fields";

export const EXCEL_ACCEPT = ".xlsx,.csv";

export type ParsedColumn = {
  key: string;
  label: string;
  required: boolean;
  matched: boolean;
};

export type ParsedRow = {
  index: number;
  values: Record<string, string>;
  errors: string[];
};

export type ParsedPreview = {
  sheetName: string;
  headers: string[];
  unknownHeaders: string[];
  columns: ParsedColumn[];
  rows: ParsedRow[];
  total: number;
  validCount: number;
  errorCount: number;
};

export async function parseExcel(kind: ImportKind, file: File): Promise<ParsedPreview> {
  const res = await apiClient.upload<{ data: ParsedPreview }>(`/excel/parse?kind=${kind}`, file);
  return res.data;
}

export function templateName(kind: ImportKind): string {
  return kind === "students" ? "学生名单_导入模板.xlsx" : kind === "vocab" ? "词汇表_导入模板.xlsx" : "听写词表_导入模板.xlsx";
}

export async function downloadTemplate(kind: ImportKind): Promise<void> {
  await apiClient.downloadFile(`/excel/template?kind=${kind}`, templateName(kind));
}

export async function downloadExport(path: string, fallbackName: string): Promise<string> {
  return apiClient.downloadFile(path, fallbackName);
}
