"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useClasses } from "@/hooks/use-classes";
import { useWorkspace } from "@/stores/workspace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { ProgressRing } from "@/components/charts/progress-ring";
import { Sparkline } from "@/components/charts/sparkline";
import { TypewriterQuote } from "@/components/common/typewriter-quote";
import { Settings, Monitor, Headphones, Sparkles, Users, BookOpen, CalendarDays } from "lucide-react";
import { greeting, todayStr, cn } from "@/lib/utils";
import { CARD_DEFS, DEFAULT_CARD_ORDER, type Overview } from "./cards";

const SortableCards = dynamic(() => import("./sortable-cards").then((m) => m.SortableCards), {
  ssr: false,
  loading: () => <LoadingState />,
});

const STORAGE_KEY = "overview-cards-v1";

type CardConfig = { order: string[]; hidden: string[] };

/** 今日日期：10月24日 星期五 */
function todayLong(): string {
  return new Date().toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

export default function OverviewPage() {
  const router = useRouter();
  const { classes, isLoading: classLoading } = useClasses();
  const { currentClassId } = useWorkspace();
  const currentClassName = classes.find((c) => c.id === currentClassId)?.name ?? null;
  const tz = new Date().getTimezoneOffset();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["overview", tz],
    queryFn: () => apiClient.get<{ data: Overview }>("/overview?tz=" + tz),
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

  /* 本周听写正确率序列（旧 → 新），用于 Hero 仪表与趋势线 */
  const recent = ov?.recentDictations ?? [];
  const series = recent.slice().reverse().map((d) => d.avgAccuracy).filter((v): v is number => v != null);
  const weekAvg = series.length
    ? Math.round(series.reduce((a, b) => a + b, 0) / series.length)
    : null;
  const latest = recent[0]?.avgAccuracy ?? null;
  const previous = recent[1]?.avgAccuracy ?? null;
  const delta = latest != null && previous != null ? latest - previous : null;

  return (
    <div>
      {/* ══════════ Hero：墨色极光欢迎横幅 ══════════ */}
      <section className="spotlight relative mb-5 overflow-hidden rounded-[26px] shadow-[0_2px_4px_rgba(36,35,31,0.06),0_30px_64px_-30px_rgba(74,32,44,0.62)] animate-fade-in-up">
        {/* ① 墨色极光底：玫瑰 → 赭 → 紫 → 縹蓝 的流体质感 */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,#45202c_0%,#643040_16%,#8a4a52_32%,#8d5f60_48%,#6b5a7c_66%,#3f5878_84%,#2d4761_100%)]" />
        {/* ② 三团彩色光晕：让渐变流动起来 */}
        <div className="pointer-events-none absolute -left-24 -top-32 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(255,170,150,0.45),transparent_62%)]" />
        <div className="pointer-events-none absolute -right-24 -top-32 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(126,172,255,0.34),transparent_64%)]" />
        <div className="pointer-events-none absolute -bottom-56 left-1/3 h-[26rem] w-[34rem] rounded-full bg-[radial-gradient(ellipse,rgba(120,220,190,0.24),transparent_68%)]" />
        {/* ③ 和纸网格（白色极淡） */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.10] grid-veil" />
        {/* ④ 同心圆轨道 */}
        <svg
          className="pointer-events-none absolute -right-12 top-1/2 hidden h-[23rem] w-[23rem] -translate-y-1/2 text-white/20 lg:block animate-drift"
          viewBox="0 0 200 200"
          fill="none"
          aria-hidden
        >
          <circle cx="100" cy="100" r="92" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="100" cy="100" r="72" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 6" />
          <circle cx="100" cy="100" r="52" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="100" cy="100" r="30" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 5" />
          <line x1="8" y1="100" x2="192" y2="100" stroke="currentColor" strokeWidth="0.3" />
          <line x1="100" y1="8" x2="100" y2="192" stroke="currentColor" strokeWidth="0.3" />
        </svg>
        {/* ⑤ 英文水印字 */}
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-8 right-2 hidden select-none font-display text-[8.5rem] font-semibold leading-none tracking-tight text-white/[0.07] lg:block"
        >
          English
        </span>

        <div className="relative flex flex-col gap-7 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          {/* 左：文案 + 指标 + 操作 */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="eyebrow text-white/70">English Teacher Workspace</span>
              <span className="hidden h-3 w-px bg-white/25 sm:block" />
              <span className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-[11px] text-white backdrop-blur-sm">
                <CalendarDays className="h-3 w-3" />
                {todayLong()}
              </span>
            </div>

            <h2 className="mt-3.5 max-w-2xl font-serif text-[32px] font-semibold leading-[1.16] tracking-tight text-white sm:text-[38px] lg:text-[46px]">
              {greeting()}
            </h2>
            <TypewriterQuote className="mt-2 max-w-2xl font-serif text-[15px] italic leading-relaxed text-white/70 sm:text-[17px]" />

            {ov && (
              <div className="mt-5 flex flex-wrap items-center gap-x-2.5 gap-y-2 text-sm text-white/75 sm:gap-x-4">
                <span className="inline-flex items-baseline gap-1.5 rounded-full bg-white/[0.08] px-3 py-1">
                  <b className="num-display text-[19px] font-semibold leading-none text-white">{ov.totals.classes}</b> 个班级
                </span>
                <span className="inline-flex items-baseline gap-1.5 rounded-full bg-white/[0.08] px-3 py-1">
                  <b className="num-display text-[19px] font-semibold leading-none text-white">{ov.totals.students}</b> 名学生
                </span>
                <span className="inline-flex items-baseline gap-1.5 rounded-full bg-white/[0.08] px-3 py-1">
                  <b className="num-display text-[19px] font-semibold leading-none text-white">{ov.totals.openHomework}</b> 项作业待查
                </span>
                <span className="inline-flex items-baseline gap-1.5 rounded-full bg-white/[0.08] px-3 py-1">
                  <b className="num-display text-[19px] font-semibold leading-none text-white">{ov.totals.dictationLists}</b> 张听写词表
                </span>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2.5">
              <Button
                size="sm"
                className="gap-1.5 border border-white/30 bg-none bg-white text-[#4a2231] shadow-[0_6px_18px_-8px_rgba(0,0,0,0.55)] hover:bg-white/92"
                onClick={() => router.push("/dashboard/dictation")}
              >
                <Headphones className="h-4 w-4" />
                听写批改
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-white/25 bg-none bg-white/10 text-white shadow-none backdrop-blur-sm hover:border-white/45 hover:bg-white/20 hover:text-white"
                onClick={() => router.push("/classroom")}
              >
                <Monitor className="h-4 w-4" />
                课堂互动
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-white/25 bg-none bg-white/10 text-white shadow-none backdrop-blur-sm hover:border-white/45 hover:bg-white/20 hover:text-white"
                onClick={() => setCustomizing((v) => !v)}
              >
                <Settings className="h-4 w-4" />
                自定义卡片
              </Button>
            </div>
          </div>

          {/* 右：本周正确率仪表（玻璃卡浮在墨色极光上） */}
          <div className="relative shrink-0">
            <div className="flex items-center gap-4 rounded-2xl border border-white/30 bg-white/[0.16] px-4 py-3.5 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-xl sm:px-5">
              <ProgressRing value={weekAvg ?? 0} size={104} strokeWidth={8} from="#ffd9c0" to="#a9c8ff" trackColor="rgba(255,255,255,0.16)" id="hero-avg">
                <div className="text-center leading-none">
                  <div className="num-display text-[30px] font-semibold text-white">
                    {weekAvg == null ? "—" : weekAvg}
                  </div>
                  <div className="eyebrow mt-1 text-[9px] text-white/70">avg</div>
                </div>
              </ProgressRing>
              <div className="min-w-0">
                <p className="eyebrow text-white/75">This Week</p>
                <p className="mt-1 text-[13px] font-medium text-white/90">本周听写平均正确率</p>
                <div className="mt-1.5">
                  <Sparkline
                    data={series.length > 1 ? series.slice(-12) : [0, weekAvg ?? 0]}
                    width={104}
                    height={28}
                    color="#ffd9c0"
                    showDot={false}
                    id="hero-spark"
                  />
                </div>
                <p className="mt-1 text-[11px] text-white/75">
                  {delta == null ? (
                    "等待更多听写数据"
                  ) : Math.abs(delta) < 0.05 ? (
                    <span className="text-white/75">与上次持平</span>
                  ) : (
                    <span className={delta > 0 ? "text-[#b6f0cf]" : "text-[#ffc0c0]"}>
                      {delta > 0 ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}% 较上次
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

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
                        : "border-line bg-gradient-to-b from-white to-[#faf9f7] text-muted hover:border-neutral-4 hover:text-neutral-7"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {def.title}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted">拖拽卡片左侧手柄可调整顺序，点击卡片右上角 × 可隐藏</p>
          </CardContent>
        </Card>
      )}

      {ov && (
        <SortableCards
          visibleIds={visibleIds}
          cardDefs={CARD_DEFS}
          ov={ov}
          ctx={{ currentClassName }}
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