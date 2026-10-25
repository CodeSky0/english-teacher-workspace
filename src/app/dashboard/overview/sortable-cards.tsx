"use client";

import { useMemo } from "react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { GripVertical, X, type LucideIcon } from "lucide-react";
import type { CardDef, CardRenderCtx, Overview } from "./cards";

/** 每张卡的主题色，让卡片标题区有可辨识的「色彩索引」 */
const ACCENTS: Record<string, { color: string; tile: string }> = {
  stats: { color: "#b8556a", tile: "linear-gradient(160deg,#faeef0,#f3dde1)" },
  classes: { color: "#3d6896", tile: "linear-gradient(160deg,#e9f1f8,#d5e3f0)" },
  alerts: { color: "#8a6230", tile: "linear-gradient(160deg,#f7efe2,#efe2cd)" },
  todaySchedule: { color: "#4a8f74", tile: "linear-gradient(160deg,#eaf4ee,#d9eadd)" },
  weekSchedule: { color: "#4a8f74", tile: "linear-gradient(160deg,#eaf4ee,#d9eadd)" },
  recentDictations: { color: "#b8556a", tile: "linear-gradient(160deg,#faeef0,#f3dde1)" },
  weakWords: { color: "#a64953", tile: "linear-gradient(160deg,#f7dfe0,#f0cfd1)" },
  dataOverview: { color: "#7c3aed", tile: "linear-gradient(160deg,#f0ecfd,#e5dcfb)" },
};

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
  const accent = ACCENTS[id] ?? { color: "#787670", tile: "linear-gradient(160deg,#f2f1ed,#eae8e2)" };
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
    zIndex: isDragging ? 20 : undefined,
    boxShadow: isDragging ? "var(--shadow-lg)" : undefined,
  };
  return (
    <Card ref={setNodeRef} style={style} className="animate-fade-in-up">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="flex min-w-0 items-center gap-2.5 font-serif text-[17px] font-semibold tracking-tight">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="group/grab -ml-1 cursor-grab touch-none rounded-md p-0.5 text-neutral-4 opacity-0 transition-all duration-[var(--dur-quick)] hover:bg-neutral-3/50 hover:text-text focus-visible:opacity-100 active:cursor-grabbing group-hover/card:opacity-100 group-hover:opacity-100"
            aria-label="拖拽排序"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.8),inset_0_0_0_1px_rgba(36,35,31,0.05)]"
            style={{ backgroundImage: accent.tile, color: accent.color }}
          >
            <Icon className="h-[15px] w-[15px]" />
          </span>
          <span className="truncate">{title}</span>
        </CardTitle>
        <button
          type="button"
          onClick={onHide}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-neutral-4 opacity-0 transition-all duration-[var(--dur-quick)] hover:bg-[#f7dfe0]/70 hover:text-[#a64953] focus-visible:opacity-100 group-hover:opacity-100"
          aria-label="隐藏卡片"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </CardHeader>
      <div className="mx-5 mb-4 h-px bg-[linear-gradient(90deg,rgba(220,216,206,0),rgba(220,216,206,0.9)_12%,rgba(220,216,206,0.9)_88%,rgba(220,216,206,0))]" />
      {children}
    </Card>
  );
}

export function SortableCards({
  visibleIds,
  cardDefs,
  ov,
  ctx,
  onToggleCard,
  onReorder,
}: {
  visibleIds: string[];
  cardDefs: CardDef[];
  ov: Overview;
  ctx?: CardRenderCtx;
  onToggleCard: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
}) {
  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  }

  const defMap = useMemo(() => new Map(cardDefs.map((d) => [d.id, d])), [cardDefs]);

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={visibleIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {visibleIds.map((id) => {
            const def = defMap.get(id);
            if (!def) return null;
            return (
              <SortableCard key={id} id={id} title={def.title} icon={def.icon} onHide={() => onToggleCard(id)}>
                {def.render(ov, ctx)}
              </SortableCard>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}