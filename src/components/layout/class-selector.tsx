"use client";

import { useState } from "react";
import { useClasses, useCreateClass } from "@/hooks/use-classes";
import { useWorkspace } from "@/stores/workspace";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { ChevronDown, Plus, Check } from "lucide-react";
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
        className={cn(
          "flex items-center gap-1.5 rounded-lg border border-line/70 px-3 py-1.5 text-sm",
          "bg-gradient-to-b from-white to-[#faf9f7] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
          "transition-all duration-[var(--dur-quick)] hover:border-neutral-4 hover:shadow-paper-xs"
        )}
      >
        <span className="font-medium">{current?.name || (isLoading ? "加载中…" : "选择班级")}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted transition-transform duration-[var(--dur-quick)]",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-10 z-30 w-56 rounded-xl border border-line/70 bg-panel py-1.5 shadow-paper-lg inner-lit animate-scale-in origin-top-left">
          {classes.map((c) => {
            const active = c.id === currentClassId;
            return (
              <button
                key={c.id}
                onClick={() => { setCurrentClassId(c.id); setOpen(false); }}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-sm transition-colors duration-[var(--dur-quick)]",
                  active ? "font-medium text-primary-d" : "text-text hover:bg-neutral-3/50"
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {active && (
                    <span className="h-3.5 w-[2px] shrink-0 rounded-full bg-primary" />
                  )}
                  <span className="truncate">{c.name}</span>
                </span>
                {active ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                ) : (
                  c.enName && <span className="ml-2 shrink-0 text-xs text-muted">{c.enName}</span>
                )}
              </button>
            );
          })}
          {classes.length > 0 && <div className="my-1.5 divider-ink" />}
          <button
            onClick={() => { setShowCreate(true); setOpen(false); }}
            className="mx-1.5 flex w-[calc(100%-0.75rem)] items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-primary-d transition-colors duration-[var(--dur-quick)] hover:bg-[#f8e4e7]/70"
          >
            <Plus className="h-4 w-4" />
            新建班级
          </button>
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
