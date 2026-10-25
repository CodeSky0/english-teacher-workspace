"use client";

import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { download } from "@/lib/csv";
import { useCurrentClass } from "@/hooks/use-classes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, LoadingState } from "@/components/ui/states";
import {
  Settings, Database, Trash2, Download, Upload, RotateCcw, ScrollText, History,
  ShieldAlert, FileJson, UserRound, SlidersHorizontal, Activity, ArrowRight, PenLine,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { getErrorMessage } from "@/lib/error";
import { cn } from "@/lib/utils";

type RecycleItem = { type: string; id: string; title: string; deletedAt: string | null; classId?: string | null };
type AuditLog = { id: string; action: string; resourceType: string; resourceId: string | null; detail: unknown; createdAt: string };
type ImportJob = { id: string; module: string; mode: string; status: string; fileName: string | null; totalRows: string | null; successCount: string | null; skipCount: string | null; failCount: string | null; createdAt: string };

const ACTION_LABEL: Record<string, string> = {
  create: "创建", update: "更新", delete: "删除", restore: "恢复", purge: "彻底删除",
  import: "导入", export: "导出", backup: "备份", login: "登录",
};
const RESOURCE_LABEL: Record<string, string> = {
  student: "学生", class: "班级", dictation: "听写", dictation_word: "听写单词",
  exam: "考试", lesson_plan: "教案", vocab: "词汇", backup: "备份", resource: "资源",
};
const JOB_STATUS_STYLE: Record<string, string> = {
  pending: "bg-[linear-gradient(180deg,#f2f1ed,#eae8e2)] text-neutral-6 ring-neutral-4/40",
  processing: "bg-[linear-gradient(180deg,#e3ecf4,#d3e0ec)] text-[#3d6896] ring-[#3d6896]/20",
  completed: "bg-[linear-gradient(180deg,#e4f0e8,#d5e8dc)] text-[#3d7a5e] ring-[#5e9f7e]/25",
  failed: "bg-[linear-gradient(180deg,#f7dfe0,#f0cfd1)] text-[#a64953] ring-[#a64953]/20",
};

/** 精致开关：梅 → 縹 渐变滑轨 + 釉面滑块 */
function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors duration-[var(--dur-quick)] hover:bg-white/55"
    >
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 overflow-hidden rounded-full transition-all duration-[var(--dur-smooth)] ease-[var(--ease-smooth)]",
          "shadow-[inset_0_1px_2px_rgba(36,35,31,0.18)] ring-1 ring-inset",
          checked
            ? "ring-white/45"
            : "bg-[linear-gradient(180deg,#e6e4de,#dcdad3)] ring-line/70"
        )}
        style={checked ? { backgroundImage: "linear-gradient(100deg,#d1707f 0%,#c56473 42%,#8a6a94 72%,#3d6896 100%)" } : undefined}
      >
        {checked && <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.28),transparent_55%)]" />}
        <span
          className={cn(
            "absolute top-[3px] h-[18px] w-[18px] rounded-full bg-[linear-gradient(180deg,#ffffff,#f4f1ec)] shadow-[0_1px_3px_rgba(36,35,31,0.28),inset_0_1px_0_rgba(255,255,255,0.95)]",
            "transition-all duration-[var(--dur-smooth)] ease-[var(--ease-spring)]",
            checked ? "left-[23px]" : "left-[3px]"
          )}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[13px] font-medium transition-colors", checked ? "text-text" : "text-neutral-7")}>{label}</span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">{description}</span>
      </span>
    </button>
  );
}

export default function SettingsPage() {
  const { currentClass } = useCurrentClass();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [recycleOpen, setRecycleOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState<string | null>(null);
  // 仅影响本页展示方式的两个偏好（不涉及任何数据写入）
  const [compactLog, setCompactLog] = useState(false);
  const [showJobs, setShowJobs] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", title: "", timezone: "Asia/Shanghai" });

  const { data: profileData } = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiClient.get<{ data: { name?: string | null; displayName?: string | null; title?: string | null; timezone?: string | null } }>("/profile"),
  });
  const profile = profileData?.data;

  useEffect(() => {
    if (!profile) return;
    setProfileForm({
      name: profile.displayName || profile.name || "",
      title: profile.title || "",
      timezone: profile.timezone || "Asia/Shanghai",
    });
  }, [profile]);

  const updateProfileMut = useMutation({
    mutationFn: (d: { name: string; title: string; timezone: string }) => apiClient.patch("/profile", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("资料已更新");
      setProfileOpen(false);
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });

  const displayName = profile?.displayName || profile?.name || "当前登录教师";
  const displayTitle = profile?.title || "英语教师";

  const { data: recycleData, isLoading: recycleLoading } = useQuery({
    queryKey: ["recycle"],
    queryFn: () => apiClient.get<{ data: RecycleItem[] }>("/recycle"),
    enabled: recycleOpen,
  });
  const recycleItems = recycleData?.data ?? [];

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => apiClient.get<{ data: AuditLog[] }>("/audit/logs?limit=30"),
  });
  const { data: jobsData } = useQuery({
    queryKey: ["import-jobs"],
    queryFn: () => apiClient.get<{ data: ImportJob[] }>("/audit/jobs?limit=10"),
  });
  const auditLogs = auditData?.data ?? [];
  const importJobs = jobsData?.data ?? [];

  const restoreMut = useMutation({
    mutationFn: ({ type, id }: { type: string; id: string }) => apiClient.post(`/recycle/restore/${type}/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["recycle"] }); toast.success("已恢复"); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
  const purgeMut = useMutation({
    mutationFn: ({ type, id }: { type: string; id: string }) => apiClient.delete(`/recycle/${type}/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["recycle"] }); toast.success("已彻底删除"); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });

  async function handleExport() {
    try {
      const res = await fetch("/api/backup/export");
      const json = await res.json();
      const content = JSON.stringify(json, null, 2);
      download(`英语教师工作台_备份_${formatDate(new Date())}.json`, content, "application/json");
      toast.success("备份已导出");
    } catch { toast.error("导出失败"); }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await apiClient.post<{ counts?: Record<string, number> }>("/backup/import?mode=append", data);
      toast.success(`恢复成功，导入 ${res.counts?.classes ?? 0} 个班级，${res.counts?.students ?? 0} 个学生`);
    } catch (err: unknown) { toast.error(getErrorMessage(err, "导入失败")); }
    e.target.value = "";
  }

  return (
    <div>
      {/* ══════════ 深色账户概览 ══════════ */}
      <section className="spotlight relative mb-4 overflow-hidden rounded-[26px] shadow-[0_2px_4px_rgba(36,35,31,0.06),0_28px_60px_-30px_rgba(58,42,45,0.55)] animate-fade-in-up">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,#3d2630_0%,#5a3542_20%,#7d4d55_40%,#6b5a72_60%,#3f5878_82%,#2d4761_100%)]" />
        <div className="pointer-events-none absolute -left-20 -top-28 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(255,170,150,0.32),transparent_64%)]" />
        <div className="pointer-events-none absolute -right-20 -top-28 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,rgba(126,172,255,0.28),transparent_66%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.09] grid-veil" />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-7 right-3 hidden select-none font-display text-[7.5rem] font-semibold leading-none tracking-tight text-white/[0.07] lg:block"
        >
          Settings
        </span>

        <div className="relative flex flex-col gap-6 p-6 sm:p-7 xl:flex-row xl:items-center xl:justify-between xl:gap-10">
          <div className="flex min-w-0 items-center gap-4">
            <span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-[linear-gradient(155deg,#ffe0c8_0%,#e5a4b1_46%,#a9c8ff_100%)] font-serif text-[26px] font-semibold text-[#3a2430] shadow-[0_16px_34px_-18px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.55)]">
              <span className="absolute inset-0 rounded-[20px] bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.5),transparent_58%)]" />
              <span className="relative">{displayName.slice(0, 1)}</span>
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#fdfaf5] text-[#4a8f74] shadow-[0_2px_6px_rgba(0,0,0,0.35)]">
                <Activity className="h-2.5 w-2.5" />
              </span>
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="eyebrow text-white/55">Preferences</span>
                <span className="h-3 w-px bg-white/25" />
                <span className="text-[11px] text-white/60">{displayTitle}</span>
              </div>
              <h2 className="mt-1.5 font-serif text-[26px] font-semibold leading-tight tracking-tight text-white sm:text-[30px]">
                设置
              </h2>
              <p className="mt-1 text-[12px] text-white/65">
                {displayName} · 当前班级 {currentClass?.name ?? "未选择"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:w-[26rem]">
            {[
              { icon: UserRound, label: "个人资料", value: "教师账户", hint: "Profile" },
              { icon: Database, label: "数据保存", value: "服务端数据库", hint: "Storage" },
              { icon: RotateCcw, label: "删除策略", value: "软删除可恢复", hint: "Recovery" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-xl border border-white/20 bg-white/[0.10] px-3 py-2.5 backdrop-blur-sm">
                  <div className="flex items-center gap-1.5 text-white/50">
                    <Icon className="h-3 w-3" />
                    <span className="text-[9px] uppercase tracking-[0.16em]">{item.hint}</span>
                  </div>
                  <p className="mt-1.5 text-[12px] font-medium text-white/90">{item.value}</p>
                  <p className="mt-0.5 text-[10px] text-white/50">{item.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>


      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        {/* ══════════ 主列：个人信息 / 数据管理 / 操作日志 ══════════ */}
        <div className="space-y-4">
          {/* 个人信息：釉面卡 */}
          <Card className="glaze overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,transparent,rgba(197,100,115,0.5),rgba(61,104,150,0.4),transparent)]" />
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">Profile</p>
                  <CardTitle className="mt-1.5 flex items-center gap-2.5 text-[17px]">
                    <span className="icon-slot"><UserRound /></span>
                    个人信息
                  </CardTitle>
                </div>
                <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={() => setProfileOpen(true)}>
                  <PenLine className="h-3.5 w-3.5" />编辑资料
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[linear-gradient(155deg,#d1707f_0%,#c56473_52%,#a85463_100%)] font-serif text-[22px] font-semibold text-white shadow-[0_12px_26px_-14px_rgba(168,84,99,0.85),inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-1px_0_rgba(0,0,0,0.12)]">
                  <span className="absolute inset-0 rounded-[18px] bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.42),transparent_55%)]" />
                  <span className="relative">师</span>
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#fdfaf5] text-[#4a8f74] shadow-[0_2px_6px_rgba(36,35,31,0.2)] ring-1 ring-inset ring-line/60">
                    <Activity className="h-2.5 w-2.5" />
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[15px] font-medium text-text">{displayName}</p>
                    <span className="rounded-full bg-white/75 px-2 py-0.5 text-[10px] text-neutral-6 ring-1 ring-inset ring-line/70">{displayTitle}</span>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">
                    姓名、职务、默认班级和时区设置可在「编辑资料」中修改。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 数据管理：纸卡 + 三枚动作行 */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="eyebrow">Backup &amp; Restore</p>
                  <CardTitle className="mt-1.5 flex items-center gap-2.5 text-[17px]">
                    <span className="icon-slot"><Database /></span>
                    数据管理
                  </CardTitle>
                </div>
                <span className="hidden text-[11px] text-muted sm:inline">JSON 全量备份</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { icon: Download, label: "导出备份", desc: "下载 JSON 快照", tone: "#3d6896", tile: "linear-gradient(160deg,#e9f1f8,#d5e3f0)", action: handleExport },
                  { icon: Upload, label: "导入备份", desc: "从文件恢复数据", tone: "#4a8f74", tile: "linear-gradient(160deg,#eaf4ee,#d9eadd)", action: () => fileRef.current?.click() },
                  { icon: RotateCcw, label: "回收站", desc: "恢复误删内容", tone: "#b8556a", tile: "linear-gradient(160deg,#faeef0,#f3dde1)", action: () => setRecycleOpen(true) },
                ].map((it) => {
                  const Icon = it.icon;
                  return (
                    <button
                      key={it.label}
                      onClick={it.action}
                      className="group relative overflow-hidden rounded-xl border border-white/70 bg-[linear-gradient(168deg,rgba(255,255,255,0.9),rgba(250,248,244,0.66))] p-3 text-left shadow-[0_1px_2px_rgba(36,35,31,0.04),inset_0_1px_0_rgba(255,255,255,0.95)] transition-all duration-[var(--dur-smooth)] ease-[var(--ease-smooth)] hover:-translate-y-[2px] hover:border-primary/20 hover:shadow-paper-md"
                    >
                      <span className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-0 blur-2xl transition-opacity duration-[var(--dur-smooth)] group-hover:opacity-50" style={{ background: it.tone }} />
                      <span className="relative flex items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ring-1 ring-inset ring-black/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]" style={{ background: it.tile, color: it.tone }}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13px] font-medium text-text">{it.label}</span>
                          <span className="mt-0.5 block truncate text-[11px] text-muted">{it.desc}</span>
                        </span>
                      </span>
                      <ArrowRight className="absolute right-2.5 top-2.5 h-3 w-3 -translate-x-0.5 text-neutral-4 opacity-0 transition-all duration-[var(--dur-quick)] group-hover:translate-x-0 group-hover:opacity-70" />
                    </button>
                  );
                })}
              </div>
              <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
                <FileJson className="h-3 w-3" />
                备份包含全部业务数据，可用于更换设备或灾难恢复。
              </p>
            </CardContent>
          </Card>

          {/* 操作日志：时间轴 */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="eyebrow">Activity</p>
                  <CardTitle className="mt-1.5 flex items-center gap-2.5 text-[17px]">
                    <span className="icon-slot"><ScrollText /></span>
                    操作日志
                  </CardTitle>
                </div>
                <span className="text-[11px] text-muted">最近 {auditLogs.length} 条</span>
              </div>
            </CardHeader>
            <CardContent>
              {auditLoading ? <LoadingState /> : auditLogs.length === 0 ? (
                <EmptyState
                  className="py-8"
                  icon={<ScrollText className="h-5 w-5" />}
                  title="暂无操作记录"
                  description="新增学生、导入成绩或导出备份后，操作会记录在这里"
                />
              ) : (
                <ol className="relative max-h-[19rem] overflow-y-auto scrollbar-thin pl-4">
                  <span className="pointer-events-none absolute bottom-2 left-[5px] top-2 w-px bg-[linear-gradient(180deg,rgba(197,100,115,0.35),rgba(197,100,115,0.08))]" />
                  {auditLogs.map((log) => (
                    <li
                      key={log.id}
                      className={cn(
                        "group relative -ml-4 flex items-center gap-2.5 rounded-lg pl-4 pr-2 transition-colors duration-[var(--dur-quick)] hover:bg-[linear-gradient(90deg,rgba(248,228,231,0.4),transparent_75%)]",
                        compactLog ? "py-1" : "py-2"
                      )}
                    >
                      <span className="absolute left-[1px] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[linear-gradient(180deg,#d97787,#a64953)] shadow-[0_0_0_3px_rgba(255,255,255,0.9)]" />
                      <span className="shrink-0 rounded-md bg-[linear-gradient(180deg,#f8e4e7,#f2d6da)] px-2 py-0.5 text-[11px] font-medium text-primary-d ring-1 ring-inset ring-primary/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                        {ACTION_LABEL[log.action] ?? log.action}
                      </span>
                      {!compactLog && (
                        <span className="text-[12px] text-neutral-7">{RESOURCE_LABEL[log.resourceType] ?? log.resourceType}</span>
                      )}
                      <span className="ml-auto shrink-0 text-[11px] tabular-nums text-muted">{formatDate(log.createdAt)}</span>
                    </li>
                  ))}
                </ol>
              )}

              {showJobs && importJobs.length > 0 && (
                <div className="mt-4 rounded-xl border border-white/70 bg-[linear-gradient(168deg,rgba(255,255,255,0.66),rgba(249,247,242,0.55))] p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-muted">
                    <History className="h-3.5 w-3.5" />最近导入任务
                  </p>
                  <div className="space-y-1.5">
                    {importJobs.map((job) => (
                      <div key={job.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-white/55 px-2.5 py-1.5 text-[11px] ring-1 ring-inset ring-white/80">
                        <span className="font-medium text-neutral-7">{job.module === "student" ? "学生" : job.module === "vocab" ? "词汇" : "听写单词"}</span>
                        <span className={`rounded px-1.5 py-0.5 font-medium ring-1 ring-inset ${JOB_STATUS_STYLE[job.status] ?? JOB_STATUS_STYLE.pending}`}>
                          {job.status === "completed" ? "完成" : job.status === "failed" ? "失败" : job.status === "processing" ? "处理中" : "等待"}
                        </span>
                        {job.successCount && <span className="text-muted">成功 {job.successCount}</span>}
                        {job.failCount && job.failCount !== "0" && <span className="text-[#a64953]">失败 {job.failCount}</span>}
                        <span className="ml-auto tabular-nums text-muted">{formatDate(job.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ══════════ 侧列：界面偏好 / 危险操作 ══════════ */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card className="glaze overflow-hidden">
            <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(61,104,150,0.14),transparent_68%)]" />
            <CardHeader className="pb-2">
              <p className="eyebrow">Display</p>
              <CardTitle className="mt-1.5 flex items-center gap-2.5 text-[17px]">
                <span className="icon-slot"><SlidersHorizontal /></span>
                界面偏好
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <Switch
                checked={compactLog}
                onChange={setCompactLog}
                label="紧凑日志"
                description="隐藏日志中的资源类型，单行显示更多记录"
              />
              <span className="mx-2 block h-px bg-line/70" />
              <Switch
                checked={showJobs}
                onChange={setShowJobs}
                label="显示导入任务"
                description="在日志下方展示最近的批量导入结果"
              />
              <p className="px-2 pt-2 text-[10px] leading-relaxed text-neutral-5">
                以上偏好仅影响当前页面展示，不会写入服务器。
              </p>
            </CardContent>
          </Card>

          {/* 危险操作：苏芳红 */}
          <Card className="overflow-hidden border-[#a64953]/25">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(165deg,rgba(247,223,224,0.5),rgba(255,255,255,0.4)_60%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,transparent,rgba(166,73,83,0.6),transparent)]" />
            <CardHeader className="relative pb-2">
              <p className="eyebrow text-[#a64953]/70">Danger Zone</p>
              <CardTitle className="mt-1.5 flex items-center gap-2.5 text-[17px] text-[#a64953]">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ring-[#a64953]/20"
                  style={{ backgroundImage: "linear-gradient(180deg,#f7dfe0,#f0cfd1)", color: "#a64953", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }}
                >
                  <ShieldAlert className="h-4 w-4" />
                </span>
                危险操作
              </CardTitle>
            </CardHeader>
            <CardContent className="relative space-y-2">
              <div className="rounded-xl border border-[#a64953]/20 bg-white/55 p-2.5">
                <p className="text-[12px] font-medium text-neutral-7">清空当前班级数据</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted">删除该班级下的作业、成绩、考勤等业务数据。</p>
                <Button variant="outline" size="sm" className="mt-2 w-full gap-1.5 border-[#a64953]/35 text-[#a64953] hover:border-[#a64953]/55 hover:bg-[#f7dfe0]/45 hover:text-[#a64953]" onClick={() => setConfirmOpen("class")}>
                  <Trash2 className="h-3.5 w-3.5" />清空当前班级数据
                </Button>
              </div>
              <div className="rounded-xl border border-[#a64953]/20 bg-white/55 p-2.5">
                <p className="text-[12px] font-medium text-neutral-7">清空全部业务数据</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted">不可撤销，建议先导出一份 JSON 备份。</p>
                <Button variant="outline" size="sm" className="mt-2 w-full gap-1.5 border-[#a64953]/35 text-[#a64953] hover:border-[#a64953]/55 hover:bg-[#f7dfe0]/45 hover:text-[#a64953]" onClick={() => setConfirmOpen("all")}>
                  <Trash2 className="h-3.5 w-3.5" />清空全部业务数据
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={recycleOpen} onClose={() => setRecycleOpen(false)} title="回收站" className="max-w-2xl">
        {recycleLoading ? <LoadingState /> : recycleItems.length === 0 ? <EmptyState title="回收站为空" /> :
          <div className="max-h-96 divide-y divide-line overflow-y-auto scrollbar-thin">
            {recycleItems.map((item) => (
              <div key={`${item.type}-${item.id}`} className="flex items-center justify-between gap-3 px-1 py-2.5 transition-colors duration-[var(--dur-quick)] hover:bg-[linear-gradient(90deg,rgba(248,228,231,0.45),transparent)]">
                <div className="min-w-0">
                  <span className="block truncate text-sm font-medium">{item.title}</span>
                  <span className="mt-0.5 block text-[11px] text-muted">{item.type} · {formatDate(item.deletedAt)}</span>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="icon" variant="outline" aria-label="恢复该项目" onClick={() => restoreMut.mutate({ type: item.type, id: item.id })}><RotateCcw className="h-4 w-4" /></Button>
                  <Button size="icon" variant="destructive" aria-label="彻底删除该项目" onClick={() => purgeMut.mutate({ type: item.type, id: item.id })}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>}
      </Dialog>

      <Dialog open={profileOpen} onClose={() => setProfileOpen(false)} title="编辑个人资料" className="max-w-md">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>姓名</Label>
            <Input value={profileForm.name} onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))} placeholder="如：林老师" />
          </div>
          <div className="space-y-1.5">
            <Label>职务</Label>
            <Input value={profileForm.title} onChange={(e) => setProfileForm((p) => ({ ...p, title: e.target.value }))} placeholder="如：英语教师 / 教研组长" />
          </div>
          <div className="space-y-1.5">
            <Label>时区</Label>
            <Input value={profileForm.timezone} onChange={(e) => setProfileForm((p) => ({ ...p, timezone: e.target.value }))} placeholder="Asia/Shanghai" />
          </div>
          <p className="text-[11px] leading-relaxed text-muted">资料会保存到当前账户，用于工作台内的显示与时间计算。</p>
          <Button
            className="w-full"
            disabled={updateProfileMut.isPending}
            onClick={() => updateProfileMut.mutate({ name: profileForm.name.trim(), title: profileForm.title.trim(), timezone: profileForm.timezone.trim() || "Asia/Shanghai" })}
          >
            {updateProfileMut.isPending ? "保存中…" : "保存资料"}
          </Button>
        </div>
      </Dialog>

      <Dialog open={!!confirmOpen} onClose={() => setConfirmOpen(null)} title="确认操作">
        <div className="flex items-start gap-3 rounded-xl border border-[#a64953]/20 bg-[#f7dfe0]/40 p-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#a64953]" />
          <p className="text-sm leading-relaxed text-[#a64953]">此操作不可撤销，确定要{confirmOpen === "class" ? "清空当前班级数据" : "清空全部业务数据"}吗？</p>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmOpen(null)}>取消</Button>
          <Button variant="destructive" onClick={() => { toast.info("此功能需要连接数据库后使用"); setConfirmOpen(null); }}>确认</Button>
        </div>
      </Dialog>
    </div>
  );
}
