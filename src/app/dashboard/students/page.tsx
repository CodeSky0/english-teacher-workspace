"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCurrentClass } from "@/hooks/use-classes";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/states";
import { ImportDialog } from "@/components/common/import-dialog";
import { downloadExport } from "@/lib/excel/client";
import { Plus, Search, Pencil, Trash2, Users, Upload, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

  const createMut = useMutation({
    mutationFn: (data: any) => apiClient.post("/students", { ...data, classId: currentClass?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["students"] }); toast.success("已添加"); },
    onError: (e: any) => toast.error(e.message || "添加失败"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.patch(`/students/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["students"] }); toast.success("已保存"); },
    onError: (e: any) => toast.error(e.message || "保存失败"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/students/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["students"] }); toast.success("已删除"); },
    onError: (e: any) => toast.error(e.message || "删除失败"),
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
    await deleteMut.mutateAsync(deleteId);
    setDeleteId(null);
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
    } catch (e: any) {
      toast.error(e?.message || "导出失败");
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
           <div className="overflow-x-auto">
             <table className="w-full text-sm">
               <thead>
                 <tr className="border-b border-line text-left text-muted">
                   <th className="px-4 py-3 font-medium">姓名</th>
                   <th className="px-4 py-3 font-medium">英文名</th>
                   <th className="px-4 py-3 font-medium">性别</th>
                   <th className="px-4 py-3 font-medium">学号</th>
                   <th className="px-4 py-3 font-medium">座位号</th>
                   <th className="px-4 py-3 font-medium text-right">操作</th>
                 </tr>
               </thead>
               <tbody>
                 {filtered.map((st) => (
                   <tr key={st.id} className="border-b border-line/50 hover:bg-bg/50">
                     <td className="px-4 py-2.5 font-medium">{st.name}</td>
                     <td className="px-4 py-2.5 text-muted">{st.enName || "—"}</td>
                     <td className="px-4 py-2.5">{st.gender === "male" ? "男" : st.gender === "female" ? "女" : "—"}</td>
                     <td className="px-4 py-2.5 text-muted">{st.studentNo || "—"}</td>
                     <td className="px-4 py-2.5 text-muted">{st.seatNo || "—"}</td>
                     <td className="px-4 py-2.5 text-right">
                       <button onClick={() => openEdit(st)} className="text-muted hover:text-primary">
                         <Pencil className="inline h-4 w-4" />
                       </button>
                       <button onClick={() => setDeleteId(st.id)} className="ml-3 text-muted hover:text-red-500">
                         <Trash2 className="inline h-4 w-4" />
                       </button>
                     </td>
                   </tr>
                 ))}
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

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} title="确认删除">
        <p className="text-sm text-muted">删除后该学生将进入回收站，可在设置中恢复。</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteId(null)}>取消</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending}>确认删除</Button>
        </div>
      </Dialog>
    </div>
  );
}
