"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { apiClient } from "@/lib/api-client";
import { useClasses } from "@/hooks/use-classes";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { GripVertical, X, Settings, type LucideIcon } from "lucide-react";
import { greeting, todayStr, cn } from "@/lib/utils";
import { CARD_DEFS, DEFAULT_CARD_ORDER, type Overview } from "./cards";

const STORAGE_KEY = "overview-cards-v1";

type CardConfig = { order: string[]; hidden: string[] };

function SortableCard({
  id,
  title,
  icon: Icon,
  onHide,
  children,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
  onHide: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 20 : undefined,
  };
  return (
    <Card ref={setNodeRef} style={style} className="animate-fade-in-up">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none text-neutral-4 transition-colors duration-[var(--dur-quick)] hover:text-text active:cursor-grabbing"
            aria-label="拖拽排序"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        <button
          type="button"
          onClick={onHide}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-4 transition-all duration-[var(--dur-quick)] hover:bg-[#f3dadb]/50 hover:text-[#a64953]"
          aria-label="隐藏卡片"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </CardHeader>
      {children}
    </Card>
  );
}

export default function OverviewPage() {
  const { classes, isLoading: classLoading } = useClasses();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["overview"],
    queryFn: () => apiClient.get<{ data: Overview }>("/overview"),
  });
  const ov = data?.data;

  const [config, setConfig] = useState<CardConfig>({ order: DEFAULT_CARD_ORDER, hidden: [] });
  const [ready, setReady] = useState(false);
  const [customizing, setCustomizing] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CardConfig;
        const known = new Set(parsed.order);
        const missing = DEFAULT_CARD_ORDER.filter((id) => !known.has(id));
        setConfig({ order: [...parsed.order, ...missing], hidden: parsed.hidden ?? [] });
      }
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      } catch {
        // ignore
      }
    }
  }, [config, ready]);

  const visibleIds = config.order.filter((id) => !config.hidden.includes(id));

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setConfig((cfg) => ({
      ...cfg,
      order: arrayMove(cfg.order, cfg.order.indexOf(String(active.id)), cfg.order.indexOf(String(over.id))),
    }));
  }

  function toggleCard(id: string) {
    setConfig((cfg) => ({
      ...cfg,
      hidden: cfg.hidden.includes(id) ? cfg.hidden.filter((x) => x !== id) : [...cfg.hidden, id],
    }));
  }

  if (isLoading || classLoading) return <LoadingState />;
  if (error) return <ErrorState message="加载失败" onRetry={() => refetch()} />;

  return (
    <div>
      <PageHeader title="总览" description={`${greeting()}！今天是 ${todayStr()}`} />

      <div className="mb-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setCustomizing((v) => !v)}>
          <Settings className="mr-1.5 h-4 w-4" />
          自定义卡片
        </Button>
      </div>

      {customizing && (
        <Card className="mb-4 animate-scale-in">
          <CardContent className="pt-5">
            <p className="mb-3 text-sm font-medium">显示 / 隐藏卡片</p>
            <div className="flex flex-wrap gap-2">
              {CARD_DEFS.map((def) => {
                const visible = !config.hidden.includes(def.id);
                const Icon = def.icon;
                return (
                  <button
                    key={def.id}
                    type="button"
                    onClick={() => toggleCard(def.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-all duration-[var(--dur-quick)] ease-[var(--ease-smooth)]",
                      visible
                        ? "border-primary/40 bg-primary-l/60 text-primary-d shadow-paper-xs"
                        : "border-line text-muted hover:bg-neutral-3/50 hover:text-neutral-7",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {def.title}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted">
              拖拽卡片左侧手柄可调整顺序，点击卡片右上角 × 可隐藏
            </p>
          </CardContent>
        </Card>
      )}

      {ov && (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {visibleIds.map((id) => {
                const def = CARD_DEFS.find((d) => d.id === id);
                if (!def) return null;
                return (
                  <SortableCard
                    key={id}
                    id={id}
                    title={def.title}
                    icon={def.icon}
                    onHide={() => toggleCard(id)}
                  >
                    {def.render(ov)}
                  </SortableCard>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {classes.length > 1 && (
        <p className="mt-4 text-xs text-muted">
          当前共 {classes.length} 个班级，切换班级请使用顶栏班级选择器。
        </p>
      )}
    </div>
  );
}
