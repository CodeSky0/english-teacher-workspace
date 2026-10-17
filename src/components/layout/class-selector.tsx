"use client";

import { useState } from "react";
import { useClasses, useCreateClass } from "@/hooks/use-classes";
import { useWorkspace } from "@/stores/workspace";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/error";

export function ClassSelector() {
  const { classes, isLoading } = useClasses();
  const { currentClassId, setCurrentClassId } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [enName, setEnName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const createClass = useCreateClass();

  const current = classes.find((c) => c.id === currentClassId);

  async function handleCreate() {
    if (!name.trim()) return;
    try {
      await createClass.mutateAsync({ name, enName, gradeLevel });
      toast.success("班级创建成功");
      setShowCreate(false);
      setName(""); setEnName(""); setGradeLevel("");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "创建失败"));
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md border border-line bg-panel px-3 py-1.5 text-sm hover:bg-bg"
      >
        <span className="font-medium">{current?.name || (isLoading ? "加载中…" : "选择班级")}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted" />
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-30 w-56 rounded-md border border-line bg-panel py-1 shadow-md">
          {classes.map((c) => (
            <button
              key={c.id}
              onClick={() => { setCurrentClassId(c.id); setOpen(false); }}
              className={cn(
                "flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-bg",
                c.id === currentClassId && "font-medium text-primary"
              )}
            >
              {c.name}
              {c.enName && <span className="text-xs text-muted">{c.enName}</span>}
            </button>
          ))}
          <div className="border-t border-line pt-1">
            <button
              onClick={() => { setShowCreate(true); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-bg"
            >
              <Plus className="h-4 w-4" />
              新建班级
            </button>
          </div>
        </div>
      )}
      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="新建班级"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>班级名称</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：高一(3)班" />
          </div>
          <div className="space-y-1.5">
            <Label>英文名称</Label>
            <Input value={enName} onChange={(e) => setEnName(e.target.value)} placeholder="如：Class 3" />
          </div>
          <div className="space-y-1.5">
            <Label>年级</Label>
            <Input value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} placeholder="如：高一" />
          </div>
          <Button onClick={handleCreate} disabled={createClass.isPending} className="w-full">
            {createClass.isPending ? "创建中…" : "创建"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
