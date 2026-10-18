"use client";

import { useState, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { apiClient } from "@/lib/api-client";
import { useCurrentClass } from "@/hooks/use-classes";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/states";
import { downloadExport } from "@/lib/excel/client";
import { Plus, Search, Pencil, Trash2, Users, Upload, Download, Lock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/error";

const ImportDialog = dynamic(() => import("@/components/common/import-dialog").then((m) => m.ImportDialog), {
  ssr: false,
});

type Student = {
  id: string;
  classId: string;
  name: string;
  enName: string | null;
  gender: "male" | "female" | "unknown";
  studentNo: string | null;
  seatNo: number | null;
};

export default function StudentsPage() {
  const { currentClass, classes, isLoading: classLoading } = useCurrentClass();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [form, setForm] = useState({ name: "", enName: "", gender: "unknown", studentNo: "", seatNo: "" });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["students", currentClass?.id],
    queryFn: () => apiClient.get<{ data: Student[] }>(`/students?classId=${currentClass?.id}`),
    enabled: !!currentClass,
  });

  const students = data?.data ?? [];

  const filtered = useMemo(() => {
    if (!search) return students;
    const s = search.toLowerCase();
    return students.filter(
      (st) => st.name.toLowerCase().includes(s) || st.enName?.toLowerCase().includes(s) || st.studentNo?.includes(s)
    );
  }, [students, search]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 44,
    overscan: 8,
  });

  const createMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiClient.post("/students", { ...data, classId: currentClass?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["students"] }); toast.success("已添加"); },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "添加失败")),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => apiClient.patch(`/students/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["students"] }); toast.success("已保存"); },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "保存失败")),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/students/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["students"] }); toast.success("已删除"); },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "删除失败")),
  });

  function openCreate() {
    setEditing(null);
    setForm({ name: "", enName: "", gender: "unknown", studentNo: "", seatNo: "" });
    setDialogOpen(true);
  }

  function openEdit(st: Student) {
    setEditing(st);
    setForm({
      name: st.name,
      enName: st.enName || "",
      gender: st.gender,
      studentNo: st.studentNo || "",
      seatNo: st.seatNo?.toString() || "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.name.trim()) { toast.error("姓名不能为空"); return; }
    const payload = {
      name: form.name,
      enName: form.enName || null,
      gender: form.gender,
      studentNo: form.studentNo || null,
      seatNo: form.seatNo ? parseInt(form.seatNo) : null,
    };
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, data: payload });
    } else {
      await createMut.mutateAsync(payload);
    }
    setDialogOpen(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    if (!deletePassword.trim()) { toast.error("请输入密码以确认删除"); return; }
    setVerifying(true);
    try {
      await apiClient.post("/profile/verify-password", { password: deletePassword });
    } catch {
      toast.error("密码错误，删除已取消");
      setVerifying(false);
      return;
    }
    setVerifying(false);
    await deleteMut.mutateAsync(deleteId);
    setDeleteId(null);
    setDeletePassword("");
  }

  async function handleImport(rows: Record<string, string>[], mode: "append" | "upsert") {
    const res = await apiClient.post<{
      data: {
        created: number; updated: number; skipped: number; errors: { index: number; message: string }[];
      };
    }>("/import/students", { classId: currentClass?.id, rows, mode });
    qc.invalidateQueries({ queryKey: ["students"] });
    const { created, updated, skipped, errors } = res.data;
    toast.success(`导入完成：新增 ${created} 人${updated ? `，更新 ${updated} 人` : ""}${skipped ? `，跳过重复 ${skipped} 人` : ""}`);
    if (errors?.length) toast.warning(`${errors.length} 行数据有误已忽略`);
  }

  async function handleExport() {
    if (!currentClass) return;
    setExporting(true);
    try {
      await downloadExport(`/export/students?classId=${currentClass.id}`, `学生名单_${currentClass.name}.xlsx`);
      toast.success("已导出 Excel");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "导出失败"));
    } finally {
      setExporting(false);
    }
  }

  if (classLoading) return <LoadingState />;
  if (!currentClass) {
    return (
      <div>
        <PageHeader title="学生管理" />
        <Card><CardContent className="py-12">
          <EmptyState icon={<Users className="h-10 w-10" />} title="请先创建班级" description="点击顶栏选择班级或新建班级" />
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="学生管理"
        description={`${currentClass.name} · 共 ${students.length} 名学生`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-1.5" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" />
              导入 Excel
            </Button>
            <Button variant="outline" className="gap-1.5" onClick={handleExport} disabled={exporting}>
              <Download className="h-4 w-4" />
              {exporting ? "导出中…" : "导出 Excel"}
            </Button>
            <Button onClick={openCreate} className="gap-1.5">
              <Plus className="h-4 w-4" />
              添加学生
            </Button>
          </div>
        }
      />
      <div className="mb-4 flex items-center gap-2">
        <Search className="h-4 w-4 text-muted" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索姓名、英文名或学号…" className="h-8 max-w-xs" />
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading ? <LoadingState /> : error ? <ErrorState message="加载失败" onRetry={() => refetch()} /> :
           filtered.length === 0 ? <EmptyState icon={<Users className="h-10 w-10" />} title={search ? "未找到匹配学生" : "暂无学生"} description={search ? "尝试其他搜索词" : "点击右上角添加学生"} /> :
           <div ref={scrollRef} className="overflow-auto max-h-[70vh]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="table-head border-b border-line text-left text-xs text-muted backdrop-blur-sm">
                    <th className="px-4 py-3 font-medium">姓名</th>
                    <th className="px-4 py-3 font-medium">英文名</th>
                    <th className="px-4 py-3 font-medium">性别</th>
                    <th className="px-4 py-3 font-medium">学号</th>
                    <th className="px-4 py-3 font-medium">座位号</th>
                    <th className="px-4 py-3 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const items = rowVirtualizer.getVirtualItems();
                    if (items.length === 0) return null;
                    const padTop = items[0].start;
                    const padBottom = rowVirtualizer.getTotalSize() - items[items.length - 1].end;
                    return (
                      <>
                        {padTop > 0 && <tr style={{ height: padTop }}><td colSpan={6} /></tr>}
                        {items.map((vr) => {
                          const st = filtered[vr.index];
                          return (
                            <tr key={st.id} className="group border-b border-line/50 transition-colors duration-[var(--dur-quick)] hover:bg-gradient-to-r hover:from-[#f8e4e7]/55 hover:via-[#f8e4e7]/10 hover:to-transparent" style={{ height: vr.size }}>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2.5">
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-b from-[#eeece7] to-[#e5e3dc] font-serif text-[12px] text-neutral-7 ring-1 ring-inset ring-[#cfccc4]/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                                    {st.name.slice(0, 1)}
                                  </span>
                                  <span className="truncate font-medium tracking-[0.01em]">{st.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-muted">{st.enName || <span className="text-[#c9c6bd]">—</span>}</td>
                              <td className="px-4 py-2.5">
                                {st.gender === "male" || st.gender === "female" ? (
                                  <span className={`rounded px-1.5 py-[1px] text-[11px] ring-1 ring-inset ${st.gender === "male" ? "bg-[#e3ecf4] text-[#3d6896] ring-[#3d6896]/18" : "bg-[#f5dde0] text-[#a85463] ring-[#c56473]/18"}`}>
                                    {st.gender === "male" ? "男" : "女"}
                                  </span>
                                ) : <span className="text-[#c9c6bd]">—</span>}
                              </td>
                              <td className="px-4 py-2.5 tabular-nums text-muted">{st.studentNo || <span className="text-[#c9c6bd]">—</span>}</td>
                              <td className="px-4 py-2.5 tabular-nums text-muted">{st.seatNo || <span className="text-[#c9c6bd]">—</span>}</td>
                              <td className="px-4 py-2.5 text-right">
                                <div className="inline-flex gap-1 opacity-55 transition-opacity duration-[var(--dur-quick)] group-hover:opacity-100">
                                  <button onClick={() => openEdit(st)} title="编辑" className="rounded-md p-1.5 text-muted transition-colors hover:bg-panel hover:text-primary hover:shadow-[var(--shadow-xs)]">
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => setDeleteId(st.id)} title="删除" className="rounded-md p-1.5 text-muted transition-colors hover:bg-[#f8e4e7] hover:text-[#a64953] hover:shadow-[var(--shadow-xs)]">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {padBottom > 0 && <tr style={{ height: padBottom }}><td colSpan={6} /></tr>}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editing ? "编辑学生" : "添加学生"}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>姓名 *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="学生姓名" />
          </div>
          <div className="space-y-1.5">
            <Label>英文名</Label>
            <Input value={form.enName} onChange={(e) => setForm({ ...form, enName: e.target.value })} placeholder="English name" />
          </div>
          <div className="space-y-1.5">
            <Label>性别</Label>
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="flex h-9 w-full rounded-md border border-line bg-panel px-3 text-sm"
            >
              <option value="unknown">未知</option>
              <option value="male">男</option>
              <option value="female">女</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>学号</Label>
              <Input value={form.studentNo} onChange={(e) => setForm({ ...form, studentNo: e.target.value })} placeholder="如 001" />
            </div>
            <div className="space-y-1.5">
              <Label>座位号</Label>
              <Input type="number" value={form.seatNo} onChange={(e) => setForm({ ...form, seatNo: e.target.value })} placeholder="如 1" />
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending} className="w-full">
            {(createMut.isPending || updateMut.isPending) ? "保存中…" : "保存"}
          </Button>
        </div>
      </Dialog>

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        kind="students"
        title="导入学生名单"
        target={`导入到：${currentClass?.name ?? ""}`}
        confirmLabel="导入学生"
        onConfirm={handleImport}
      />

      <Dialog
        open={!!deleteId}
        onClose={() => { setDeleteId(null); setDeletePassword(""); }}
        title="确认删除学生"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-[#f3dadb] bg-[#f3dadb]/40 p-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-[#a64953]" />
            <p className="text-sm text-[#a64953]">
              删除后该学生将进入回收站，可在设置中恢复。此操作需验证你的账户密码。
            </p>
          </div>
          <div className="space-y-2">
            <Label>账户密码</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-4" />
              <Input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="输入你的登录密码以确认"
                className="pl-9"
                onKeyDown={(e) => { if (e.key === "Enter" && !deleteMut.isPending && !verifying) handleDelete(); }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setDeleteId(null); setDeletePassword(""); }}>取消</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMut.isPending || verifying || !deletePassword.trim()}
            >
              {(deleteMut.isPending || verifying) ? "验证中…" : "确认删除"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
