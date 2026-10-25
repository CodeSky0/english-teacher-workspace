"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { downloadTemplate, parseExcel, EXCEL_ACCEPT, type ParsedPreview } from "@/lib/excel/client";
import type { ImportKind } from "@/lib/excel/fields";
import { Upload, Download, FileSpreadsheet, AlertTriangle, Loader2, CheckCircle2, X } from "lucide-react";
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
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (open) return;
    setFile(null);
    setPreview(null);
    setParsing(false);
    setSubmitting(false);
    setMode("append");
    setSkipErrors(true);
    setDragging(false);
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
      else toast.success("已解析 " + data.total + " 行，其中 " + data.validCount + " 行有效");
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
        {/* 拖拽上传区：虚线玻璃框，拖入时整体点亮 */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "group relative overflow-hidden rounded-xl border border-dashed p-4 transition-all duration-[var(--dur-smooth)] ease-[var(--ease-smooth)]",
            dragging
              ? "border-primary/60 bg-[linear-gradient(120deg,rgba(248,228,231,0.75),rgba(221,231,240,0.55))] shadow-glow"
              : "border-line/80 bg-[linear-gradient(160deg,rgba(255,255,255,0.9),rgba(249,248,245,0.75))]"
          )}
        >
          <div className="pointer-events-none absolute inset-0 grid-veil opacity-40" />
          <div className="relative flex flex-wrap items-center gap-2">
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
            <span className="text-xs text-muted">支持拖拽 .xlsx / .csv，表头中英文均可识别</span>
          </div>
          <input ref={fileRef} type="file" accept={EXCEL_ACCEPT} className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        </div>

        {file && (
          <div className="flex items-center gap-2 rounded-lg border border-line/60 bg-white/70 px-3 py-2 text-sm">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            <span className="max-w-[22rem] truncate font-medium">{file.name}</span>
            {preview?.sheetName && <span className="text-xs text-muted">工作表：{preview.sheetName}</span>}
            {parsing && <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin text-muted" />}
            {preview && !parsing && <CheckCircle2 className="ml-1 h-3.5 w-3.5 text-[#3d7a5e]" />}
            <button
              type="button"
              className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-neutral-5 transition-colors hover:bg-neutral-2 hover:text-text"
              onClick={() => {
                setFile(null);
                setPreview(null);
              }}
              aria-label="移除文件"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {extra}

        {allowUpsert && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line/60 bg-neutral-2/40 px-3 py-2 text-sm">
            <span className="text-muted">导入方式</span>
            <label className="flex cursor-pointer items-center gap-1.5">
              <input type="radio" checked={mode === "append"} onChange={() => setMode("append")} />
              追加（重复项跳过）
            </label>
            <label className="flex cursor-pointer items-center gap-1.5">
              <input type="radio" checked={mode === "upsert"} onChange={() => setMode("upsert")} />
              追加并更新（按学号/姓名或单词匹配）
            </label>
          </div>
        )}

        {preview && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-muted">共 {preview.total} 行 · 有效 {preview.validCount} 行</span>
                {preview.errorCount > 0 && (
                  <label className="flex items-center gap-1.5 text-muted">
                    <input type="checkbox" checked={skipErrors} onChange={(e) => setSkipErrors(e.target.checked)} />
                    跳过 {preview.errorCount} 行错误数据
                  </label>
                )}
              </div>
              {preview.unknownHeaders.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-[#8a6230]">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  忽略未识别列：{preview.unknownHeaders.join("、")}
                </span>
              )}
            </div>

            <div className="max-h-64 overflow-auto rounded-lg border border-line/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] scrollbar-thin">
              <table className="w-full text-xs">
                <thead className="sticky top-0 table-head backdrop-blur-sm">
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
                    <tr key={r.index} className={cn("border-b border-line/50 transition-colors", r.errors.length > 0 ? "bg-[#f7dfe0]/55" : "hover:bg-neutral-2/50")}>
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

        <div className="flex justify-end gap-2 border-t border-line/60 pt-3">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={!preview || usableRows.length === 0 || submitting || parsing}>
            {submitting ? "导入中…" : confirmLabel + (preview ? "（" + usableRows.length + " 条）" : "")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
