"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useClasses } from "@/hooks/use-classes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { Settings, Monitor, Headphones } from "lucide-react";
import { greeting, todayStr, cn } from "@/lib/utils";
import { CARD_DEFS, DEFAULT_CARD_ORDER, type Overview } from "./cards";

const SortableCards = dynamic(() => import("./sortable-cards").then((m) => m.SortableCards), {
  ssr: false,
  loading: () => <LoadingState />,
});

const STORAGE_KEY = "overview-cards-v1";

type CardConfig = { order: string[]; hidden: string[] };

export default function OverviewPage() {
  const router = useRouter();
  const { classes, isLoading: classLoading } = useClasses();
  const tz = new Date().getTimezoneOffset();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["overview", tz],
    queryFn: () => apiClient.get<{ data: Overview }>(`/overview?tz=${tz}`),
    staleTime: 90 * 1000,
  });
  const ov = data?.data;

  const [config, setConfig] = useState<CardConfig>({ order: DEFAULT_CARD_ORDER, hidden: [] });
  const [ready, setReady] = useState(false);
  const [customizing, setCustomizing] = useState(false);

  // 欢迎横幅鼠标聚光：rAF 节流，避免 mousemove 高频触发 getBoundingClientRect 重排
  const bannerRef = useRef<HTMLDivElement>(null);
  const mouseRafRef = useRef<number | null>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  useEffect(() => () => {
    if (mouseRafRef.current != null) cancelAnimationFrame(mouseRafRef.current);
  }, []);

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
      {/* ── 欢迎横幅：和纸渐变 + 光晕 + 随鼠标聚光 + 快捷入口 ── */}
      <div
        ref={bannerRef}
        onMouseMove={(e) => {
          mousePosRef.current = { x: e.clientX, y: e.clientY };
          if (mouseRafRef.current != null) return;
          mouseRafRef.current = requestAnimationFrame(() => {
            mouseRafRef.current = null;
            const el = bannerRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            el.style.setProperty("--mx", `${mousePosRef.current.x - r.left}px`);
            el.style.setProperty("--my", `${mousePosRef.current.y - r.top}px`);
          });
        }}
        className="group relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-[#fdf6f7] via-[#faf9f7] to-[#f4f7fa] edge-lit p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_10px_-3px_rgba(36,35,31,0.10)] animate-fade-in-up"
      >
        {/* 跟随鼠标的柔光：让横幅"活"起来 */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 ease-[var(--ease-smooth)] group-hover:opacity-100"
          style={{ background: "radial-gradient(460px circle at var(--mx, 50%) var(--my, 50%), rgba(197,100,115,0.10), transparent 68%)" }}
        />
        <div className="pointer-events-none absolute inset-0 grid-veil opacity-50" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-primary/[0.14] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-14 right-1/4 h-36 w-36 rounded-full bg-[#3d6896]/10 blur-3xl" />
        {/* 和风同心圆 */}
        <svg className="pointer-events-none absolute right-8 top-1/2 hidden h-28 w-28 -translate-y-1/2 text-primary/[0.13] sm:block" viewBox="0 0 100 100" fill="none" aria-hidden>
          <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="0.6" />
          <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="0.6" />
          <circle cx="50" cy="50" r="18" stroke="currentColor" strokeWidth="0.6" />
        </svg>

        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] tracking-[0.2em] text-neutral-5 uppercase">
              English Teacher Workspace
            </p>
            <h2 className="mt-1.5 font-serif text-[28px] font-semibold leading-tight tracking-tight text-text">
              {greeting()}！今天是 {todayStr()}
            </h2>
            {ov && (
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                <span>
                  共 <span className="font-medium tabular-nums text-text">{ov.totals.classes}</span> 个班级
                </span>
                <span className="h-3 w-px bg-line" />
                <span>
                  <span className="font-medium tabular-nums text-text">{ov.totals.students}</span> 名学生
                </span>
                {ov.totals.openHomework > 0 && (
                  <>
                    <span className="h-3 w-px bg-line" />
                    <span>
                      <span className="font-medium tabular-nums text-text">{ov.totals.openHomework}</span> 项作业待查
                    </span>
                  </>
                )}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => router.push("/classroom")}>
              <Monitor className="h-4 w-4" />
              课堂互动
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => router.push("/dashboard/dictation")}>
              <Headphones className="h-4 w-4" />
              听写批改
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCustomizing((v) => !v)}>
              <Settings className="h-4 w-4" />
              自定义卡片
            </Button>
          </div>
        </div>
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
                        ? "border-primary/40 bg-gradient-to-b from-[#f8e4e7] to-[#f2d6da] font-medium text-primary-d shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                        : "border-line bg-gradient-to-b from-white to-[#faf9f7] text-muted hover:border-neutral-4 hover:text-neutral-7",
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
