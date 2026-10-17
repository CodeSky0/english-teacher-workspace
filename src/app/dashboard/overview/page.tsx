"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useClasses } from "@/hooks/use-classes";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { Settings } from "lucide-react";
import { greeting, todayStr, cn } from "@/lib/utils";
import { CARD_DEFS, DEFAULT_CARD_ORDER, type Overview } from "./cards";

const SortableCards = dynamic(() => import("./sortable-cards").then((m) => m.SortableCards), {
  ssr: false,
  loading: () => <LoadingState />,
});

const STORAGE_KEY = "overview-cards-v1";

type CardConfig = { order: string[]; hidden: string[] };

export default function OverviewPage() {
  const { classes, isLoading: classLoading } = useClasses();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["overview"],
    queryFn: () => apiClient.get<{ data: Overview }>("/overview"),
    staleTime: 90 * 1000,
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

  function handleReorder(activeId: string, overId: string) {
    setConfig((cfg) => {
      const oldIndex = cfg.order.indexOf(activeId);
      const newIndex = cfg.order.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1) return cfg;
      const next = [...cfg.order];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      return { ...cfg, order: next };
    });
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
        <SortableCards
          visibleIds={visibleIds}
          cardDefs={CARD_DEFS}
          ov={ov}
          onToggleCard={toggleCard}
          onReorder={handleReorder}
        />
      )}

      {classes.length > 1 && (
        <p className="mt-4 text-xs text-muted">
          当前共 {classes.length} 个班级，切换班级请使用顶栏班级选择器。
        </p>
      )}
    </div>
  );
}
