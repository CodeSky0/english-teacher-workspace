"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { downloadTemplate, parseExcel, EXCEL_ACCEPT, type ParsedPreview } from "@/lib/excel/client";
import type { ImportKind } from "@/lib/excel/fields";
import { Upload, Download, FileSpreadsheet, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/error";

const PREVIEW_LIMIT = 50;

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  kind: ImportKind;
  title: string;
  /** 目标说明，例如「导入到：高一(1)班」 */
  target?: string;
  /** 额外的目标选择区（如词汇单元下拉） */
  extra?: React.ReactNode;
  /** 是否允许「更新已有数据」模式 */
  allowUpsert?: boolean;
  confirmLabel?: string;
  onConfirm: (rows: Record<string, string>[], mode: "append" | "upsert") => Promise<void>;
}

export function ImportDialog({
  open,
  onClose,
  kind,
  title,
  target,
  extra,
  allowUpsert = true,
  confirmLabel = "确认导入",
  onConfirm,
}: ImportDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedPreview | null>(null);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"append" | "upsert">("append");
  const [skipErrors, setSkipErrors] = useState(true);

  useEffect(() => {
    if (open) return;
    setFile(null);
    setPreview(null);
    setParsing(false);
    setSubmitting(false);
    setMode("append");
    setSkipErrors(true);
  }, [open]);

  async function handleFile(next: File | undefined | null) {
    if (!next) return;
    setFile(next);
    setPreview(null);
    setParsing(true);
    try {
      const data = await parseExcel(kind, next);
      setPreview(data);
      if (data.total === 0) toast.warning("文件中没有读取到数据行");
      else toast.success(`已解析 ${data.total} 行，其中 ${data.validCount} 行有效`);
    } catch (e: unknown) {
      setFile(null);
      toast.error(getErrorMessage(e, "解析失败"));
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const columns = preview?.columns.filter((c) => c.matched) ?? [];
  const rows = preview?.rows ?? [];
  const usableRows = skipErrors ? rows.filter((r) => r.errors.length === 0) : rows;

  async function handleConfirm() {
    if (!preview) return;
    const payload = usableRows.map((r) => r.values);
    if (payload.length === 0) {
      toast.error("没有可导入的有效数据");
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(payload, mode);
      onClose();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "导入失败"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={title} description={target} className="max-w-3xl">
      <div className="space-y-4">
        <div className="grid-veil flex flex-wrap items-center gap-2 rounded-xl border border-line/70 bg-gradient-to-b from-white to-[#faf9f7] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()} disabled={parsing}>
            {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            选择 Excel 文件
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={async () => {
              try {
                await downloadTemplate(kind);
              } catch (e: unknown) {
                toast.error(getErrorMessage(e, "模板下载失败"));
              }
            }}
          >
            <Download className="h-4 w-4" />
            下载模板
          </Button>
          <span className="text-xs text-muted">支持 .xlsx / .csv，表头中英文均可识别</span>
          <input
            ref={fileRef}
            type="file"
            accept={EXCEL_ACCEPT}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>

        {file && (
          <div className="flex items-center gap-2 text-sm">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            <span className="font-medium">{file.name}</span>
            {preview?.sheetName && <span className="text-xs text-muted">工作表：{preview.sheetName}</span>}
          </div>
        )}

        {extra}

        {allowUpsert && (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-muted">导入方式</span>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={mode === "append"} onChange={() => setMode("append")} />
              追加（重复项跳过）
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={mode === "upsert"} onChange={() => setMode("upsert")} />
              追加并更新（按学号/姓名或单词匹配）
            </label>
          </div>
        )}

        {preview && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-muted">
                  共 {preview.total} 行 · 有效 {preview.validCount} 行
                </span>
                {preview.errorCount > 0 && (
                  <label className="flex items-center gap-1.5 text-muted">
                    <input type="checkbox" checked={skipErrors} onChange={(e) => setSkipErrors(e.target.checked)} />
                    跳过 {preview.errorCount} 行错误数据
                  </label>
                )}
              </div>
              {preview.unknownHeaders.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  忽略未识别列：{preview.unknownHeaders.join("、")}
                </span>
              )}
            </div>

            <div className="max-h-64 overflow-auto rounded-md border border-line">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-panel">
                  <tr className="border-b border-line text-left text-muted">
                    <th className="px-2 py-2 font-medium">行</th>
                    {columns.map((c) => (
                      <th key={c.key} className="px-2 py-2 font-medium">
                        {c.label}
                        {c.required && <span className="text-[#a64953]"> *</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, PREVIEW_LIMIT).map((r) => (
                    <tr
                      key={r.index}
                      className={cn("border-b border-line/50", r.errors.length > 0 && "bg-[#f7dfe0]/60")}
                    >
                      <td className="px-2 py-1.5 text-muted">{r.index}</td>
                      {columns.map((c) => (
                        <td key={c.key} className="px-2 py-1.5">
                          {r.values[c.key] || "—"}
                          {r.errors.length > 0 && c.required && !r.values[c.key] && (
                            <span className="ml-1 text-[#a64953]">缺失</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.rows.length > PREVIEW_LIMIT && (
              <p className="text-xs text-muted">仅预览前 {PREVIEW_LIMIT} 行，导入时会处理全部 {preview.total} 行</p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={!preview || usableRows.length === 0 || submitting || parsing}>
            {submitting ? "导入中…" : `${confirmLabel}${preview ? `（${usableRows.length} 条）` : ""}`}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
