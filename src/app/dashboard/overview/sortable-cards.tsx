"use client";

import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { GripVertical, X, type LucideIcon } from "lucide-react";
import type { CardDef, Overview } from "./cards";

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
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex min-w-0 items-center gap-2.5 text-[15px]">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="-ml-1 cursor-grab touch-none rounded-md p-0.5 text-neutral-4 transition-colors duration-[var(--dur-quick)] hover:bg-neutral-3/50 hover:text-text active:cursor-grabbing"
            aria-label="拖拽排序"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          {/* 标题图标槽：梅色淡底方块 */}
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-[#f8e4e7] to-[#f2d6da] text-primary ring-1 ring-inset ring-primary/15">
            <Icon className="h-[15px] w-[15px]" />
          </span>
          <span className="truncate">{title}</span>
        </CardTitle>
        <button
          type="button"
          onClick={onHide}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-neutral-4 transition-all duration-[var(--dur-quick)] hover:bg-[#f7dfe0]/70 hover:text-[#a64953]"
          aria-label="隐藏卡片"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </CardHeader>
      {children}
    </Card>
  );
}

export function SortableCards({
  visibleIds,
  cardDefs,
  ov,
  onToggleCard,
  onReorder,
}: {
  visibleIds: string[];
  cardDefs: CardDef[];
  ov: Overview;
  onToggleCard: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
}) {
  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={visibleIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {visibleIds.map((id) => {
            const def = cardDefs.find((d) => d.id === id);
            if (!def) return null;
            return (
              <SortableCard
                key={id}
                id={id}
                title={def.title}
                icon={def.icon}
                onHide={() => onToggleCard(id)}
              >
                {def.render(ov)}
              </SortableCard>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
