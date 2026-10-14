"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { download } from "@/lib/csv";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { Settings, Database, Trash2, Download, Upload, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

type RecycleItem = { type: string; id: string; title: string; deletedAt: string | null; classId?: string | null };

export default function SettingsPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [recycleOpen, setRecycleOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState<string | null>(null);

  const { data: recycleData, isLoading: recycleLoading } = useQuery({
    queryKey: ["recycle"],
    queryFn: () => apiClient.get<{ data: RecycleItem[] }>("/recycle"),
    enabled: recycleOpen,
  });
  const recycleItems = recycleData?.data ?? [];

  const restoreMut = useMutation({
    mutationFn: ({ type, id }: { type: string; id: string }) => apiClient.post(`/recycle/restore/${type}/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["recycle"] }); toast.success("已恢复"); },
    onError: (e: any) => toast.error(e.message),
  });
  const purgeMut = useMutation({
    mutationFn: ({ type, id }: { type: string; id: string }) => apiClient.delete(`/recycle/${type}/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["recycle"] }); toast.success("已彻底删除"); },
    onError: (e: any) => toast.error(e.message),
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
    } catch (err: any) { toast.error(err.message || "导入失败"); }
    e.target.value = "";
  }

  return (
    <div>
      <PageHeader title="设置" description="管理个人信息、数据和示例数据" />
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Settings className="h-4 w-4" />个人信息</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted">姓名、职务、默认班级和时区设置可在个人资料中修改。</p></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Database className="h-4 w-4" />数据管理</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}><Download className="h-4 w-4" />导出 JSON 备份</Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" />导入 JSON 备份</Button>
              <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setRecycleOpen(true)}><RotateCcw className="h-4 w-4" />回收站</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base text-red-600"><Trash2 className="h-4 w-4" />危险操作</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="destructive" size="sm" onClick={() => setConfirmOpen("class")}>清空当前班级数据</Button>
              <Button variant="destructive" size="sm" onClick={() => setConfirmOpen("all")}>清空全部业务数据</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={recycleOpen} onClose={() => setRecycleOpen(false)} title="回收站" className="max-w-2xl">
        {recycleLoading ? <LoadingState /> : recycleItems.length === 0 ? <EmptyState title="回收站为空" /> :
          <div className="max-h-96 overflow-y-auto divide-y divide-line">
            {recycleItems.map((item) => (
              <div key={`${item.type}-${item.id}`} className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm font-medium">{item.title}</span>
                  <span className="ml-2 text-xs text-muted">{item.type} · {formatDate(item.deletedAt)}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => restoreMut.mutate({ type: item.type, id: item.id })}><RotateCcw className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => purgeMut.mutate({ type: item.type, id: item.id })}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>}
      </Dialog>

      <Dialog open={!!confirmOpen} onClose={() => setConfirmOpen(null)} title="确认操作">
        <p className="text-sm text-red-600">此操作不可撤销，确定要{confirmOpen === "class" ? "清空当前班级数据" : "清空全部业务数据"}吗？</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmOpen(null)}>取消</Button>
          <Button variant="destructive" onClick={() => { toast.info("此功能需要连接数据库后使用"); setConfirmOpen(null); }}>确认</Button>
        </div>
      </Dialog>
    </div>
  );
}
