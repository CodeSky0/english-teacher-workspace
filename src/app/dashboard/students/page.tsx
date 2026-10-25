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
import { Input, Label } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/states";
import { downloadExport } from "@/lib/excel/client";
import { MetricTile, MetricRing } from "@/components/charts/metric-tile";
import {
  Plus, Search, Pencil, Trash2, Users, Upload, Download, Lock, AlertTriangle,
  User, UserRound, ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";
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

/** 头像渐变：按姓名稳定取色；深色字保证对比度 */
const AVATAR_TONES = [
  { bg: "linear-gradient(160deg,#f3c6cd,#e0a3ac)", fg: "#7c3a44" },
  { bg: "linear-gradient(160deg,#c9dbeb,#a9c6df)", fg: "#2f5478" },
  { bg: "linear-gradient(160deg,#cfe6d9,#aad3bf)", fg: "#2f6349" },
  { bg: "linear-gradient(160deg,#efdcbd,#e3c795)", fg: "#6b4a20" },
  { bg: "linear-gradient(160deg,#e6d6e8,#d3b7d7)", fg: "#6b4368" },
];
function avatarTone(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

/** 档案四项：英文名 / 性别 / 学号 / 座位号 */
function profileFields(st: Student) {
  return [
    { key: "enName", filled: !!st.enName, color: "#3d6896", label: "英文名" },
    { key: "gender", filled: st.gender !== "unknown", color: "#c56473", label: "性别" },
    { key: "studentNo", filled: !!st.studentNo, color: "#a87a3d", label: "学号" },
    { key: "seatNo", filled: st.seatNo != null, color: "#5e9f7e", label: "座位号" },
  ];
}

export default function StudentsPage() {
  const { currentClass, isLoading: classLoading } = useCurrentClass();
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

  const students = useMemo(() => data?.data ?? [], [data]);

  const filtered = useMemo(() => {
    if (!search) return students;
    const s = search.toLowerCase();
    return students.filter(
      (st) => st.name.toLowerCase().includes(s) || st.enName?.toLowerCase().includes(s) || st.studentNo?.includes(s)
    );
  }, [students, search]);

  /** 性别分布与档案完整度（纯派生，无额外请求） */
  const stats = useMemo(() => {
    const male = students.filter((s) => s.gender === "male").length;
    const female = students.filter((s) => s.gender === "female").length;
    const filled = students.reduce((acc, st) => acc + profileFields(st).filter((f) => f.filled).length, 0);
    const completeness = students.length ? Math.round((filled / (students.length * 4)) * 100) : 0;
    return { male, female, completeness };
  }, [students]);

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
            <Button variant="outline" className="gap-1.5 bg-white/60 backdrop-blur-md" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" />
              导入 Excel
            </Button>
            <Button variant="outline" className="gap-1.5 bg-white/60 backdrop-blur-md" onClick={handleExport} disabled={exporting}>
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

      {/* ══════════ KPI 条：人数 / 性别 / 档案完整度 ══════════ */}
      {!isLoading && !error && students.length > 0 && (
        <div className="stagger mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricTile index={0} label="学生总数" hint="Students" value={students.length} suffix="人" icon={Users} tone="hanada" />
          <MetricTile index={1} label="男生" hint="Boys" value={stats.male} suffix="人" icon={User} tone="wakatake" />
          <MetricTile index={2} label="女生" hint="Girls" value={stats.female} suffix="人" icon={UserRound} tone="ume" />
          <MetricRing index={3} label="档案完整率" hint="Profile" value={stats.completeness} icon={ClipboardCheck} tone="kuchiba" from="#d8b57e" to="#8a6230" />
        </div>
      )}

      {/* 搜索 + 筛选状态 */}
      <div className="mb-3 flex flex-wrap items-center gap-2.5 rounded-xl border border-white/70 bg-white/60 px-3 py-2 shadow-[0_1px_2px_rgba(36,35,31,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md">
        <Search className="h-4 w-4 shrink-0 text-muted" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索姓名、英文名或学号…"
          className="h-8 max-w-xs border-0 bg-transparent shadow-none focus-visible:shadow-none"
        />
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2 py-0.5 text-[11px] text-neutral-6 ring-1 ring-inset ring-line/70">
          {search ? (
            <>
              <span className="tabular-nums">{filtered.length}</span> / {students.length} 人匹配
            </>
          ) : (
            <>
              共 <span className="tabular-nums">{students.length}</span> 名学生
            </>
          )}
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? <LoadingState /> : error ? <ErrorState message="加载失败" onRetry={() => refetch()} /> :
           filtered.length === 0 ? (
            <div className="relative overflow-hidden">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(197,100,115,0.07),transparent_70%)]" />
              <EmptyState
                icon={<Users className="h-10 w-10" />}
                title={search ? "未找到匹配学生" : "暂无学生"}
                description={search ? "尝试其他搜索词，或清空搜索查看全部" : "点击右上角添加学生，或从 Excel 批量导入"}
                className="relative py-16"
                action={!search ? (
                  <button
                    onClick={openCreate}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[linear-gradient(180deg,#d1707f,#c56473_52%,#ac5566)] px-4 py-2 text-sm font-medium text-white shadow-[0_6px_14px_-6px_rgba(168,84,99,0.55),inset_0_1px_0_rgba(255,255,255,0.3)] transition-transform duration-[var(--dur-quick)] hover:-translate-y-[1px]"
                  >
                    <Plus className="h-4 w-4" />
                    添加第一位学生
                  </button>
                ) : undefined}
              />
            </div>
          ) :
            <div ref={scrollRef} className="max-h-[70vh] overflow-auto scrollbar-thin" style={{ contain: "layout style" }}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="table-head border-b border-line text-left text-xs text-muted backdrop-blur-sm">
                    <th className="px-4 py-3 font-medium">学生</th>
                    <th className="px-4 py-3 font-medium">英文名</th>
                    <th className="px-4 py-3 font-medium">性别</th>
                    <th className="px-4 py-3 font-medium">学号</th>
                    <th className="px-4 py-3 font-medium">座位号</th>
                    <th className="px-4 py-3 font-medium">档案</th>
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
                        {padTop > 0 && <tr style={{ height: padTop }}><td colSpan={7} /></tr>}
                        {items.map((vr) => {
                          const st = filtered[vr.index];
                          const tone = avatarTone(st.name);
                          const fields = profileFields(st);
                          const filledCount = fields.filter((f) => f.filled).length;
                          return (
                            <tr key={st.id} className="group border-b border-line/50 transition-colors duration-[var(--dur-quick)] hover:bg-gradient-to-r hover:from-[#f8e4e7]/55 hover:via-[#f8e4e7]/10 hover:to-transparent" style={{ height: vr.size }}>
                              <td className="relative px-4 py-2.5">
                                <span className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-gradient-to-b from-[#cd6c7a] to-[#a64953] opacity-0 transition-opacity duration-[var(--dur-quick)] group-hover:opacity-100" />
                                <div className="flex items-center gap-2.5">
                                  <span
                                    className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-serif text-[13px] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_1px_3px_rgba(36,35,31,0.14)] ring-1 ring-inset ring-white/60 transition-transform duration-[var(--dur-smooth)] ease-[var(--ease-spring)] group-hover:scale-105"
                                    style={{ backgroundImage: tone.bg, color: tone.fg }}
                                  >
                                    {st.name.slice(0, 1)}
                                  </span>
                                  <span className="truncate font-medium tracking-[0.01em] transition-colors duration-[var(--dur-quick)] group-hover:text-primary-d">{st.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-muted">{st.enName || <span className="text-[#c9c6bd]">—</span>}</td>
                              <td className="px-4 py-2.5">
                                {st.gender === "male" || st.gender === "female" ? (
                                  <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-[1px] text-[11px] ring-1 ring-inset ${st.gender === "male" ? "bg-[#e3ecf4] text-[#3d6896] ring-[#3d6896]/18" : "bg-[#f5dde0] text-[#a85463] ring-[#c56473]/18"}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${st.gender === "male" ? "bg-[#3d6896]/70" : "bg-[#c56473]/70"}`} />
                                    {st.gender === "male" ? "男" : "女"}
                                  </span>
                                ) : <span className="text-[#c9c6bd]">—</span>}
                              </td>
                              <td className="px-4 py-2.5 tabular-nums text-muted">{st.studentNo || <span className="text-[#c9c6bd]">—</span>}</td>
                              <td className="px-4 py-2.5 tabular-nums text-muted">{st.seatNo || <span className="text-[#c9c6bd]">—</span>}</td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-1.5" title={`档案完整度 ${filledCount}/4`}>
                                  <div className="flex gap-[3px]">
                                    {fields.map((f) => (
                                      <span
                                        key={f.key}
                                        title={f.label}
                                        className="h-3 w-1.5 rounded-[2px] transition-colors duration-[var(--dur-quick)]"
                                        style={{
                                          backgroundColor: f.filled ? f.color : "rgba(120,118,112,0.16)",
                                          boxShadow: f.filled ? `0 0 5px ${f.color}55` : "none",
                                        }}
                                      />
                                    ))}
                                  </div>
                                  <span className={`text-[10px] tabular-nums ${filledCount === 4 ? "text-[#3d7a5e]" : "text-neutral-5"}`}>{filledCount}/4</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <div className="inline-flex gap-1 opacity-55 transition-opacity duration-[var(--dur-quick)] group-hover:opacity-100">
                                  <button onClick={() => openEdit(st)} title="编辑" aria-label={`编辑学生 ${st.name}`} className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-panel hover:text-primary hover:shadow-[var(--shadow-xs)]">
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => setDeleteId(st.id)} title="删除" aria-label={`删除学生 ${st.name}`} className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-[#f8e4e7] hover:text-[#a64953] hover:shadow-[var(--shadow-xs)]">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {padBottom > 0 && <tr style={{ height: padBottom }}><td colSpan={7} /></tr>}
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
