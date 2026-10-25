"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
// 别名避免与下方 export const dynamic = "force-dynamic" 冲突
import nextDynamic from "next/dynamic";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useCurrentClass } from "@/hooks/use-classes";
import { Dices, Trophy, Timer, Tag, Vote, Grid3x3, Layers, Headphones, X, Plus, Minus, RotateCcw, ChevronLeft, Volume2, ArrowLeft, Keyboard, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";
import { cn } from "@/lib/utils";

const NebulaRollCall = nextDynamic(
  () => import("@/components/classroom/nebula-rollcall").then((m) => m.NebulaRollCall),
  {
    ssr: false,
    loading: () => (
      <div className="mb-8 flex min-h-[400px] items-center justify-center text-sm text-white/40">
        正在准备点名动画…
      </div>
    ),
  },
);

export const dynamic = "force-dynamic";

type Student = { id: string; name: string; enName: string | null; seatNo: number | null };
type VocabWord = { id: string; word: string; meaning: string | null; phoneticUs: string | null };
type VocabUnit = { id: string; name: string };

const TOOLS = [
  { id: "rollcall", name: "随机点名", en: "Roll Call", icon: Dices, color: "#e5a4b1", tint: "rgba(197,100,115,0.18)" },
  { id: "points", name: "小组积分", en: "Group Points", icon: Trophy, color: "#e0bd84", tint: "rgba(168,122,61,0.18)" },
  { id: "timer", name: "课堂计时器", en: "Timer", icon: Timer, color: "#9fc3e6", tint: "rgba(61,104,150,0.20)" },
  { id: "feedback", name: "学生评价", en: "Feedback", icon: Tag, color: "#c3a8dd", tint: "rgba(124,58,237,0.16)" },
  { id: "poll", name: "课堂投票", en: "Live Poll", icon: Vote, color: "#e9b7a0", tint: "rgba(197,100,115,0.14)" },
  { id: "attendance", name: "座位考勤", en: "Attendance", icon: Grid3x3, color: "#a5d3b6", tint: "rgba(94,159,126,0.18)" },
  { id: "wordcard", name: "单词卡", en: "Word Cards", icon: Layers, color: "#e8c9a0", tint: "rgba(168,122,61,0.14)" },
  { id: "dictation", name: "听写训练", en: "Dictation", icon: Headphones, color: "#b9c9e2", tint: "rgba(61,104,150,0.14)" },
] as const;

/** 深色输入框：投影模式下避免刺眼的白色控件 */
const DARK_FIELD =
  "h-11 w-full rounded-xl border border-white/12 bg-white/[0.055] px-3.5 text-sm text-white/90 " +
  "placeholder:text-white/30 shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] " +
  "transition-all duration-[var(--dur-quick)] ease-[var(--ease-smooth)] " +
  "hover:border-white/20 focus-visible:outline-none focus-visible:border-[#c56473]/60 " +
  "focus-visible:bg-white/[0.085] focus-visible:ring-2 focus-visible:ring-[#c56473]/20";

type ActionVariant = "primary" | "soft" | "ghost" | "outline";

/** 投影模式按钮：≥48px 触控友好，梅色釉面主按钮 */
function ActionButton({
  children,
  onClick,
  variant = "primary",
  size = "md",
  className,
  disabled,
  type = "button",
  title,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: ActionVariant;
  size?: "md" | "lg" | "icon";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  title?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium text-white/90",
        "transition-[transform,box-shadow,background-color,border-color] duration-[var(--dur-smooth)] ease-[var(--ease-smooth)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e5a4b1]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070a14]",
        "disabled:pointer-events-none disabled:opacity-40 active:scale-[0.97]",
        variant === "primary" &&
          "bg-[linear-gradient(180deg,#d1707f_0%,#c56473_52%,#a85463_100%)] shadow-[0_10px_28px_-12px_rgba(197,100,115,0.8),inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-1px_0_rgba(0,0,0,0.18)] hover:-translate-y-[1px] hover:brightness-[1.06]",
        variant === "soft" && "border border-white/12 bg-white/[0.075] hover:border-white/25 hover:bg-white/[0.11]",
        variant === "outline" && "border border-white/18 bg-transparent hover:border-white/30 hover:bg-white/[0.06]",
        variant === "ghost" && "text-white/55 hover:bg-white/[0.07] hover:text-white/90",
        size === "md" && "h-11 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-[15px]",
        size === "icon" && "h-11 w-11",
        className
      )}
    >
      {children}
    </button>
  );
}

/** 分段控件（投影模式） */
function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-white/12 bg-white/[0.05] p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] backdrop-blur-sm">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "min-h-[36px] rounded-lg px-3.5 text-sm transition-all duration-[var(--dur-quick)] ease-[var(--ease-smooth)]",
            value === o.value
              ? "bg-white/[0.14] font-medium text-white shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_4px_10px_-6px_rgba(0,0,0,0.8)]"
              : "text-white/45 hover:text-white/80"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** 舞台：投影区的大卡片，深色玻璃 + 极光 */
function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mb-7 flex min-h-[230px] items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(165deg,rgba(255,255,255,0.055),rgba(255,255,255,0.012))] px-6 py-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_30px_70px_-45px_rgba(0,0,0,0.95)] backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:22px_22px] opacity-60" />
      <div className="pointer-events-none absolute -left-14 -top-14 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(197,100,115,0.24),transparent_66%)]" />
      <div className="pointer-events-none absolute -bottom-16 -right-12 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(61,104,150,0.24),transparent_68%)]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(94,159,126,0.14),transparent_70%)]" />
      <div className="relative">{children}</div>
    </div>
  );
}

export default function ClassroomPage() {
  const router = useRouter();
  const { currentClass } = useCurrentClass();
  const [activeTool, setActiveTool] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") { if (activeTool) setActiveTool(null); else router.push("/dashboard/overview"); } };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [router, activeTool]);

  const active = activeTool ? TOOLS.find((t) => t.id === activeTool) : null;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#070a14] text-white/85">
      {/* ══════════ 氛围层：极光 + 天光 + 暗角 ══════════ */}
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div className="absolute -left-[14%] -top-[18%] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(197,100,115,0.26),transparent_65%)] animate-drift" />
        <div className="absolute -right-[12%] top-[4%] h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,rgba(61,104,150,0.30),transparent_66%)] animate-drift" style={{ animationDelay: "-9s" }} />
        <div className="absolute -bottom-[22%] left-[22%] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(94,159,126,0.20),transparent_68%)] animate-drift" style={{ animationDelay: "-16s" }} />
        <div className="absolute left-[42%] top-[38%] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.14),transparent_70%)] animate-drift" style={{ animationDelay: "-22s" }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(255,255,255,0.09),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_38%,rgba(2,3,8,0.72)_100%)]" />
      </div>

      {/* ══════════ 顶栏 ══════════ */}
      <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#070a14]/72 px-4 backdrop-blur-xl sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          {activeTool && (
            <button
              onClick={() => setActiveTool(null)}
              aria-label="返回工具列表"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/55 transition-colors duration-[var(--dur-quick)] hover:bg-white/[0.08] hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0">
            <p className="eyebrow truncate text-[9px] text-white/35">
              {active ? active.en : "Classroom Mode"}
            </p>
            <h1 className="truncate font-serif text-[17px] font-semibold leading-tight tracking-tight text-white/92">
              {active ? active.name : "课堂互动"}
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[11px] text-white/45 sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8fcfae] shadow-[0_0_8px_rgba(143,207,174,0.8)] animate-breathe" />
            {currentClass?.name ?? "未选择班级"}
          </span>
          <ActionButton variant="ghost" size="md" onClick={() => router.push("/dashboard/overview")} className="gap-1.5">
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">退出</span>
            <kbd className="hidden rounded border border-white/15 bg-white/[0.06] px-1 py-0.5 text-[9px] tracking-wide text-white/40 md:inline">Esc</kbd>
          </ActionButton>
        </div>
      </header>

      {/* ══════════ 内容 ══════════ */}
      {!activeTool ? (
        <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 py-9 sm:px-8">
          {/* 右侧轨道光核：静默呼吸，作为投影模式的首屏焦点 */}
          <div aria-hidden className="pointer-events-none absolute right-1 top-8 hidden h-56 w-56 lg:block">
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(229,164,177,0.22),transparent_62%)] animate-breathe" />
            <div className="absolute inset-0 rounded-full border border-white/[0.09]" />
            <div className="absolute inset-7 rounded-full border border-dashed border-white/[0.10] animate-drift" />
            <div className="absolute inset-14 rounded-full border border-white/[0.12]" />
            <div className="absolute inset-0 animate-drift" style={{ animationDelay: "-8s" }}>
              <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f3d7ad] shadow-[0_0_16px_rgba(243,215,173,0.9)]" />
              <span className="absolute bottom-[14%] right-[10%] h-1.5 w-1.5 rounded-full bg-[#9fc3e6] shadow-[0_0_12px_rgba(159,195,230,0.9)]" />
              <span className="absolute left-[6%] top-[38%] h-1 w-1 rounded-full bg-[#a5d3b6] shadow-[0_0_10px_rgba(165,211,182,0.9)]" />
            </div>
            <div className="absolute inset-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fff6e6] shadow-[0_0_22px_rgba(255,246,230,0.95)]" />
            <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] uppercase tracking-[0.28em] text-white/20">Aurora Core</span>
          </div>

          <div className="relative animate-fade-in-up">
            <span className="eyebrow flex items-center gap-2 text-white/40">
              Classroom Mode
              <span className="h-px w-10 bg-[linear-gradient(90deg,rgba(229,164,177,0.5),transparent)]" />
            </span>
            <h2 className="mt-2.5 font-serif text-[30px] font-semibold leading-[1.2] tracking-tight text-white/95 sm:text-[40px]">
              把课堂投成
              <span className="bg-[linear-gradient(110deg,#f2b6c1_0%,#ddc9f0_38%,#a9c8e8_70%,#a9d6be_100%)] bg-clip-text text-transparent">
                一束光
              </span>
              。
            </h2>
            <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-white/45">
              八个课堂小工具 · 触控与投屏友好 · 空格键即可抽取
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-white/40">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                <Sparkles className="h-3 w-3 text-[#e5a4b1]" />
                8 个课堂工具
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                <Keyboard className="h-3 w-3 text-[#9fc3e6]" />
                Esc 退出 · 空格抽取
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#8fcfae]" />
                投影模式
              </span>
            </div>
          </div>

          <div className="stagger mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {TOOLS.map((tool, i) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  style={{ "--i": i } as React.CSSProperties}
                  className="group relative flex min-h-[118px] flex-col items-start overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-left backdrop-blur-md transition-all duration-[var(--dur-smooth)] ease-[var(--ease-smooth)] hover:-translate-y-[3px] hover:border-white/22 hover:bg-white/[0.075] hover:shadow-[0_24px_50px_-30px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.1)] active:scale-[0.99]"
                >
                  <span
                    className="pointer-events-none absolute -right-7 -top-7 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-[var(--dur-smooth)] group-hover:opacity-70"
                    style={{ background: tool.color }}
                  />
                  <span
                    className="relative flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-inset ring-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-transform duration-[var(--dur-quick)] ease-[var(--ease-spring)] group-hover:scale-105"
                    style={{ background: tool.tint, color: tool.color }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="relative mt-3 block text-[14.5px] font-medium leading-tight text-white/90">{tool.name}</span>
                  <span className="relative mt-1 block text-[9px] uppercase tracking-[0.2em] text-white/32">{tool.en}</span>
                </button>
              );
            })}
          </div>

          <p className="mt-6 flex items-center gap-1.5 text-[11px] text-white/25">
            <ArrowLeft className="h-3 w-3" />
            返回后台请按 Esc 或点击右上角退出
          </p>
        </main>
      ) : (
        <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-6 sm:px-8">
          <div className="relative min-h-[26rem] overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(168deg,rgba(255,255,255,0.065),rgba(255,255,255,0.018))] p-5 shadow-[0_40px_90px_-50px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-7">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(197,100,115,0.22),transparent_68%)]" />
            <div className="pointer-events-none absolute -bottom-20 -left-14 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(61,104,150,0.22),transparent_68%)]" />
            <div className="relative flex min-h-[21rem] animate-fade-in-up flex-col justify-center">
              {activeTool === "rollcall" && <RollCallTool />}
              {activeTool === "points" && <PointsTool />}
              {activeTool === "timer" && <TimerTool />}
              {activeTool === "feedback" && <FeedbackTool />}
              {activeTool === "poll" && <PollTool />}
              {activeTool === "attendance" && <AttendanceTool />}
              {activeTool === "wordcard" && <WordCardTool />}
              {activeTool === "dictation" && <DictationTool />}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

function useStudents() {
  const { currentClass } = useCurrentClass();
  const { data } = useQuery({
    queryKey: ["students", currentClass?.id],
    queryFn: () => apiClient.get<{ data: Student[] }>(`/students?classId=${currentClass?.id}`),
    enabled: !!currentClass,
  });
  return { students: data?.data ?? [], currentClass };
}

function RollCallTool() {
  const { students, currentClass } = useStudents();
  const [picked, setPicked] = useState<Student | null>(null);
  const [rolling, setRolling] = useState(false);
  const [history, setHistory] = useState<Student[]>([]);
  const [noRepeat, setNoRepeat] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const rollPool = useMemo(
    () => (noRepeat ? students.filter((s) => !history.some((h) => h.id === s.id)) : students),
    [students, history, noRepeat],
  );

  const roll = useCallback(() => {
    if (rollPool.length === 0) { toast.info(noRepeat ? "所有人都已点名" : "没有学生"); return; }
    setRolling(true);
    let ticks = 0;
    const total = 16;
    const timer = setInterval(() => {
      ticks++;
      setPicked(rollPool[Math.floor(Math.random() * rollPool.length)]);
      if (ticks >= total) {
        clearInterval(timer);
        timerRef.current = null;
        const final = rollPool[Math.floor(Math.random() * rollPool.length)];
        setPicked(final);
        setRolling(false);
        setHistory((h) => [...h, final]);
      }
    }, 70);
    timerRef.current = timer;
  }, [rollPool, noRepeat]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); roll(); } };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [roll]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  if (!currentClass) return <p className="py-10 text-center text-white/45">请先选择班级</p>;
  if (students.length === 0) return <p className="py-10 text-center text-white/45">暂无学生</p>;

  return (
    <div className="text-center">
      <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
        <Segmented
          options={[
            { value: "noRepeat", label: "不重复模式" },
            { value: "repeat", label: "可重复模式" },
          ]}
          value={noRepeat ? "noRepeat" : "repeat"}
          onChange={(v) => setNoRepeat(v === "noRepeat")}
        />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/40">
          <Keyboard className="h-3 w-3" />
          空格抽取
        </span>
      </div>

      <NebulaRollCall
        picked={picked}
        rolling={rolling}
        className="mb-6 rounded-2xl border border-white/12 shadow-[0_30px_80px_-50px_rgba(0,0,0,0.95)]"
      />

      <ActionButton onClick={roll} size="lg" className="gap-2" disabled={rolling}>
        <Dices className="h-5 w-5" />{rolling ? "星核聚能…" : "唤醒星核"}
      </ActionButton>
      {history.length > 0 && (
        <div className="mt-5">
          <p className="text-sm text-white/40">
            已点名 <span className="font-display text-[15px] font-semibold tabular-nums text-white/80">{history.length}</span> 人
          </p>
          <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
            {history.map((s, i) => (
              <span
                key={`${s.id}-${i}`}
                className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/60"
              >
                <span className="font-display text-[10px] tabular-nums text-[#e5a4b1]">{i + 1}</span>
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PointsTool() {
  const { students, currentClass } = useStudents();
  const qc = useQueryClient();
  const [groups, setGroups] = useState<Record<string, number>>({});
  const [groupName, setGroupName] = useState("");

  const addPointMut = useMutation({
    mutationFn: (d: { studentId: string; points: number; groupName: string }) => apiClient.post("/classroom/points", { ...d, classId: currentClass?.id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["classroom-points"] }),
  });

  function addGroup() { if (groupName.trim()) { setGroups({ ...groups, [groupName]: 0 }); setGroupName(""); } }
  function adjust(name: string, delta: number) { setGroups({ ...groups, [name]: (groups[name] ?? 0) + delta }); }

  return (
    <div>
      <div className="mb-5 flex gap-2">
        <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="小组名称" className={DARK_FIELD} />
        <ActionButton onClick={addGroup} className="shrink-0 gap-1.5"><Plus className="h-4 w-4" />建组</ActionButton>
      </div>
      <div className="space-y-2.5">
        {Object.entries(groups).sort((a, b) => b[1] - a[1]).map(([name, pts], i) => (
          <div
            key={name}
            className="relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015))] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-display text-[13px] font-semibold tabular-nums ring-1 ring-inset",
                  i < 3
                    ? "bg-[linear-gradient(160deg,rgba(229,164,177,0.28),rgba(197,100,115,0.16))] text-[#f3c8d1] ring-[#e5a4b1]/30"
                    : "bg-white/[0.06] text-white/50 ring-white/10"
                )}
              >
                {i + 1}
              </span>
              <span className="truncate font-medium text-white/85">{name}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <span className="font-display text-[28px] font-semibold leading-none tabular-nums text-[#f3d7ad] drop-shadow-[0_0_16px_rgba(224,189,132,0.25)]">{pts}</span>
              <ActionButton size="icon" variant="soft" onClick={() => adjust(name, 1)} title="加 1 分" ariaLabel={`给 ${name} 加 1 分`}><Plus className="h-4 w-4" /></ActionButton>
              <ActionButton size="icon" variant="soft" onClick={() => adjust(name, -1)} title="减 1 分" ariaLabel={`给 ${name} 减 1 分`}><Minus className="h-4 w-4" /></ActionButton>
            </div>
          </div>
        ))}
        {Object.keys(groups).length === 0 && (
          <p className="py-10 text-center text-sm text-white/35">请先创建小组，再为小组加减分</p>
        )}
      </div>
    </div>
  );
}

function TimerTool() {
  const [mode, setMode] = useState<"up" | "down">("up");
  const [target, setTarget] = useState(60);
  const [remaining, setRemaining] = useState(60);
  const [running, setRunning] = useState(false);
  const startRef = useRef<number>(0);
  const initialRef = useRef<number>(60);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      if (mode === "up") { setRemaining(Math.floor(elapsed)); }
      else { const r = initialRef.current - Math.floor(elapsed); setRemaining(r); if (r <= 0) { setRunning(false); toast.info("时间到！"); } }
    }, 100);
    return () => clearInterval(interval);
  }, [running, mode]);

  function start() { startRef.current = Date.now(); initialRef.current = mode === "down" ? target : 0; setRemaining(initialRef.current); setRunning(true); }
  function reset() { setRunning(false); setRemaining(mode === "down" ? target : 0); }

  const mins = Math.floor(remaining / 60); const secs = remaining % 60;

  return (
    <div className="text-center">
      <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
        <Segmented
          options={[
            { value: "up", label: "正计时" },
            { value: "down", label: "倒计时" },
          ]}
          value={mode}
          onChange={(v) => { setMode(v as "up" | "down"); reset(); }}
        />
      </div>
      {mode === "down" && !running && (
        <div className="mb-4 flex items-center justify-center gap-2">
          <input
            type="number"
            value={target}
            onChange={(e) => { const v = parseInt(e.target.value) || 0; setTarget(v); setRemaining(v); }}
            className={cn(DARK_FIELD, "w-28 text-center")}
          />
          <span className="text-sm text-white/40">秒</span>
        </div>
      )}
      <Stage>
        <div className={cn("relative font-display text-[76px] font-semibold leading-none tabular-nums tracking-tight sm:text-[92px]", running ? "animate-breathe text-[#f6ecdc]" : "text-white/90")}>
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </div>
      </Stage>
      <div className="flex justify-center gap-2.5">
        {!running ? (
          <ActionButton onClick={start} size="lg">开始</ActionButton>
        ) : (
          <ActionButton onClick={() => setRunning(false)} variant="soft" size="lg">暂停</ActionButton>
        )}
        <ActionButton onClick={reset} variant="outline" size="lg" className="gap-1.5"><RotateCcw className="h-4 w-4" />重置</ActionButton>
      </div>
    </div>
  );
}

function FeedbackTool() {
  const { students, currentClass } = useStudents();
  const TAGS = ["积极发言", "朗读流利", "表达清晰", "认真听讲", "主动合作", "需要关注", "上课走神"];
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const addFeedbackMut = useMutation({ mutationFn: (d: Record<string, unknown>) => apiClient.post("/classroom/feedback", d), onSuccess: () => toast.success("已记录"), onError: (e: unknown) => toast.error(getErrorMessage(e)) });

  return (
    <div>
      <div className="relative mb-5">
        <select
          value={selectedStudent ?? ""}
          onChange={(e) => setSelectedStudent(e.target.value)}
          className={cn(DARK_FIELD, "appearance-none pr-9 [&>option]:bg-[#0d1220] [&>option]:text-white/90")}
        >
          <option value="">选择学生…</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <ChevronLeft className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 -rotate-90 text-white/35" />
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {TAGS.map((tag) => {
          const negative = tag.includes("需要") || tag.includes("走神");
          return (
            <button
              key={tag}
              type="button"
              disabled={!selectedStudent}
              onClick={() => addFeedbackMut.mutate({ studentId: selectedStudent, tag, classId: currentClass?.id, type: negative ? "negative" : "positive" })}
              className={cn(
                "min-h-[52px] rounded-xl border px-3 text-sm transition-all duration-[var(--dur-smooth)] ease-[var(--ease-smooth)] disabled:pointer-events-none disabled:opacity-35",
                negative
                  ? "border-[#a64953]/30 bg-[rgba(166,73,83,0.12)] text-[#efb8bd] hover:border-[#a64953]/55 hover:bg-[rgba(166,73,83,0.2)] hover:-translate-y-[1px]"
                  : "border-[#5e9f7e]/28 bg-[rgba(94,159,126,0.12)] text-[#b9e0c8] hover:border-[#5e9f7e]/55 hover:bg-[rgba(94,159,126,0.2)] hover:-translate-y-[1px]"
              )}
            >
              {tag}
            </button>
          );
        })}
      </div>
      {!selectedStudent && <p className="mt-3 text-center text-[11px] text-white/30">选择学生后即可点选评价标签</p>}
    </div>
  );
}

function PollTool() {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [votes, setVotes] = useState<number[]>([0, 0]);
  const [started, setStarted] = useState(false);

  return (
    <div>
      {!started ? (
        <div className="space-y-3">
          <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="投票问题" className={DARK_FIELD} />
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <input value={opt} onChange={(e) => { const o = [...options]; o[i] = e.target.value; setOptions(o); }} placeholder={`选项 ${i + 1}`} className={DARK_FIELD} />
            </div>
          ))}
          <ActionButton variant="outline" size="md" className="gap-1.5" onClick={() => { setOptions([...options, ""]); setVotes([...votes, 0]); }}>
            <Plus className="h-4 w-4" />添加选项
          </ActionButton>
          <div>
            <ActionButton onClick={() => setStarted(true)} disabled={!question.trim()} className="mt-1 w-full">开始投票</ActionButton>
          </div>
        </div>
      ) : (
        <div>
          <h3 className="mb-5 text-center font-serif text-[21px] font-semibold text-white/90">{question}</h3>
          <div className="space-y-3">
            {options.filter((o) => o.trim()).map((opt, i) => {
              const total = votes.reduce((a, b) => a + b, 0) || 1;
              const pct = (votes[i] / total) * 100;
              return (
                <div
                  key={i}
                  className="rounded-2xl border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
                >
                  <div className="mb-2.5 flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate font-medium text-white/85">{opt}</span>
                    <span className="shrink-0 font-display text-[22px] font-semibold tabular-nums text-[#f3c8d1]">{votes[i]}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#e5a4b1,#c56473)] transition-[width] duration-[var(--dur-slow)] ease-[var(--ease-smooth)] shadow-[0_0_12px_rgba(197,100,115,0.55)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-2.5 flex gap-2">
                    <ActionButton size="icon" variant="soft" ariaLabel={`选项 ${opt} 加 1 票`} onClick={() => { const v = [...votes]; v[i]++; setVotes(v); }}><Plus className="h-3.5 w-3.5" /></ActionButton>
                    <ActionButton size="icon" variant="soft" ariaLabel={`选项 ${opt} 减 1 票`} onClick={() => { const v = [...votes]; v[i] = Math.max(0, v[i] - 1); setVotes(v); }}><Minus className="h-3.5 w-3.5" /></ActionButton>
                  </div>
                </div>
              );
            })}
          </div>
          <ActionButton variant="outline" className="mt-4" onClick={() => { setStarted(false); setVotes(votes.map(() => 0)); }}>重新编辑</ActionButton>
        </div>
      )}
    </div>
  );
}

function AttendanceTool() {
  const { students, currentClass } = useStudents();
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const STATUSES = ["unrecorded", "present", "absent", "late", "leave"];
  const STATUS_LABEL: Record<string, string> = { unrecorded: "未记录", present: "到课", absent: "缺勤", late: "迟到", leave: "请假" };
  // 和色：到课=若竹 / 缺勤=蘇芳 / 迟到=朽葉 / 请假=縹
  const STATUS_STYLE: Record<string, string> = {
    unrecorded: "border-white/10 bg-white/[0.035] text-white/70",
    present: "border-[#5e9f7e]/40 bg-[rgba(94,159,126,0.16)] text-[#b9e0c8]",
    absent: "border-[#a64953]/40 bg-[rgba(166,73,83,0.18)] text-[#efb8bd]",
    late: "border-[#a87a3d]/40 bg-[rgba(168,122,61,0.18)] text-[#e6c9a1]",
    leave: "border-[#3d6896]/45 bg-[rgba(61,104,150,0.18)] text-[#b6cde4]",
  };
  const STATUS_TEXT: Record<string, string> = {
    unrecorded: "text-white/35",
    present: "text-[#8fcfae]",
    absent: "text-[#e5a4b1]",
    late: "text-[#e0bd84]",
    leave: "text-[#9fc3e6]",
  };
  const saveMut = useMutation({ mutationFn: (d: Record<string, unknown>) => apiClient.post("/classroom/attendance", { ...d, classId: currentClass?.id, attendanceDate: today }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["attendance"] }); toast.success("已保存"); }, onError: (e: unknown) => toast.error(getErrorMessage(e)) });

  const sorted = [...students].sort((a, b) => (a.seatNo ?? 999) - (b.seatNo ?? 999));

  return (
    <div>
      <p className="mb-4 text-center text-[13px] text-white/40">{today} · 点击卡片循环切换状态</p>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
        {sorted.map((s) => {
          const status = statusMap[s.id] ?? "unrecorded";
          return (
            <button
              key={s.id}
              onClick={() => { const idx = STATUSES.indexOf(status); const next = STATUSES[(idx + 1) % STATUSES.length]; setStatusMap({ ...statusMap, [s.id]: next }); saveMut.mutate({ studentId: s.id, status: next }); }}
              className={cn(
                "min-h-[78px] rounded-2xl border p-3 text-center transition-all duration-[var(--dur-quick)] ease-[var(--ease-smooth)]",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] hover:-translate-y-[2px] hover:shadow-[0_12px_26px_-18px_rgba(0,0,0,0.9)]",
                STATUS_STYLE[status]
              )}
            >
              <p className="text-sm font-medium">{s.name}</p>
              <p className="mt-0.5 font-display text-[11px] tabular-nums text-white/30">{s.seatNo ?? "—"}</p>
              <p className={cn("mt-1 text-[11px] font-medium", STATUS_TEXT[status])}>{STATUS_LABEL[status]}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WordCardTool() {
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [randomOrder, setRandomOrder] = useState(false);

  const { data: unitsData } = useQuery({ queryKey: ["vocab-units"], queryFn: () => apiClient.get<{ data: VocabUnit[] }>("/vocab/units") });
  const units = unitsData?.data ?? [];
  const { data: wordsData } = useQuery({ queryKey: ["vocab-words", selectedUnit], queryFn: () => apiClient.get<{ data: VocabWord[] }>(`/vocab/words?unitId=${selectedUnit}`), enabled: !!selectedUnit });
  const words = wordsData?.data ?? [];
  const order = useMemo(() => (randomOrder ? [...words].sort(() => Math.random() - 0.5) : words), [words, randomOrder]);
  const current = order[index];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!current) return;
      if (e.key === "ArrowRight") { setIndex((i) => Math.min(i + 1, order.length - 1)); setFlipped(false); }
      else if (e.key === "ArrowLeft") { setIndex((i) => Math.max(i - 1, 0)); setFlipped(false); }
      else if (e.code === "Space") { e.preventDefault(); setFlipped(!flipped); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [current, flipped, order.length]);

  function speak(text: string) { if ("speechSynthesis" in window) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = "en-US"; speechSynthesis.speak(u); } }

  return (
    <div className="text-center">
      {!selectedUnit ? (
        <div className="space-y-2">
          <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-white/35">Choose a unit</p>
          {units.map((u) => (
            <ActionButton key={u.id} variant="soft" size="lg" className="w-full" onClick={() => { setSelectedUnit(u.id); setIndex(0); }}>{u.name}</ActionButton>
          ))}
        </div>
      ) : !current ? <p className="py-10 text-white/45">暂无单词</p> : (
        <div>
          <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
            <ActionButton size="md" variant="outline" onClick={() => setSelectedUnit(null)}>选择单元</ActionButton>
            <Segmented
              options={[
                { value: "random", label: "随机顺序" },
                { value: "order", label: "顺序" },
              ]}
              value={randomOrder ? "random" : "order"}
              onChange={(v) => setRandomOrder(v === "random")}
            />
          </div>
          <div
            onClick={() => setFlipped(!flipped)}
            className="group relative mb-6 flex min-h-[260px] cursor-pointer items-center justify-center overflow-hidden rounded-3xl border border-white/12 bg-[linear-gradient(170deg,rgba(255,255,255,0.07),rgba(255,255,255,0.015))] px-6 py-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_30px_70px_-45px_rgba(0,0,0,0.95)] transition-transform duration-[var(--dur-quick)] hover:-translate-y-[2px]"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:22px_22px] opacity-50" />
            <div className="pointer-events-none absolute -left-12 -top-12 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(197,100,115,0.26),transparent_66%)]" />
            <div className="pointer-events-none absolute -bottom-14 -right-12 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(61,104,150,0.26),transparent_68%)]" />
            <div className="relative">
              {flipped ? (
                <div className="animate-scale-in">
                  <p className="font-serif text-[30px] font-medium text-white/90">{current.meaning}</p>
                  {current.phoneticUs && <p className="mt-2.5 font-display text-[18px] text-[#b6cde4]">/{current.phoneticUs}/</p>}
                </div>
              ) : (
                <p className="bg-[linear-gradient(115deg,#f7e7c8_0%,#f3c8d1_38%,#c9d6ee_75%,#b9e0c8_100%)] bg-clip-text font-display text-[62px] font-semibold tracking-tight text-transparent drop-shadow-[0_0_30px_rgba(229,164,177,0.18)] sm:text-[76px]">{current.word}</p>
              )}
            </div>
            <span className="absolute bottom-3.5 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.22em] text-white/25">
              {flipped ? "Meaning" : "Tap to reveal"}
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <ActionButton variant="outline" onClick={() => { setIndex(Math.max(index - 1, 0)); setFlipped(false); }}>上一张</ActionButton>
            <ActionButton variant="soft" onClick={() => speak(current.word)} className="gap-1.5"><Volume2 className="h-4 w-4" />朗读</ActionButton>
            <ActionButton variant="outline" onClick={() => { setIndex(Math.min(index + 1, order.length - 1)); setFlipped(false); }}>下一张</ActionButton>
          </div>
          <p className="mt-4 font-display text-[13px] tabular-nums text-white/40">{index + 1} / {order.length}</p>
        </div>
      )}
    </div>
  );
}

function DictationTool() {
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [showWord, setShowWord] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});

  type DictList = { id: string; name: string };
  type DictWord = { id: string; word: string; meaning: string | null };
  const { data: listsData } = useQuery({ queryKey: ["dict-lists"], queryFn: () => apiClient.get<{ data: DictList[] }>("/dictation/lists") });
  const lists = listsData?.data ?? [];
  const { data: wordsData } = useQuery({ queryKey: ["dict-words", selectedList], queryFn: () => apiClient.get<{ data: DictWord[] }>(`/dictation/words?listId=${selectedList}`), enabled: !!selectedList });
  const words = wordsData?.data ?? [];
  const current = words[index];

  function speak(text: string) { if ("speechSynthesis" in window) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = "en-US"; speechSynthesis.speak(u); } }

  return (
    <div className="text-center">
      {!selectedList ? (
        <div className="space-y-2">
          <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-white/35">Choose a word list</p>
          {lists.map((l) => (
            <ActionButton key={l.id} variant="soft" size="lg" className="w-full" onClick={() => { setSelectedList(l.id); setIndex(0); }}>{l.name}</ActionButton>
          ))}
        </div>
      ) : !current ? <p className="py-10 text-white/45">暂无单词</p> : (
        <div>
          <Stage>
            {showWord ? (
              <p key={current.id} className="animate-scale-in bg-[linear-gradient(115deg,#f7e7c8_0%,#f3c8d1_45%,#c9d6ee_100%)] bg-clip-text font-display text-[46px] font-semibold tracking-tight text-transparent sm:text-[56px]">
                {current.word}
              </p>
            ) : (
              <p className="text-[15px] text-white/40">点击「朗读」听写，或「显示」查看拼写</p>
            )}
          </Stage>
          <div className="flex flex-wrap justify-center gap-2">
            <ActionButton variant="soft" onClick={() => speak(current.word)} className="gap-1.5"><Volume2 className="h-4 w-4" />朗读</ActionButton>
            <ActionButton variant="outline" onClick={() => setShowWord(!showWord)}>{showWord ? "隐藏" : "显示"}</ActionButton>
            <ActionButton variant="outline" onClick={() => { setResults({ ...results, [current.id]: true }); setIndex(Math.min(index + 1, words.length - 1)); setShowWord(false); }}>正确</ActionButton>
            <ActionButton variant="outline" onClick={() => { setResults({ ...results, [current.id]: false }); setIndex(Math.min(index + 1, words.length - 1)); setShowWord(false); }}>错误</ActionButton>
          </div>
          <p className="mt-4 font-display text-[13px] tabular-nums text-white/40">
            {index + 1} / {words.length} · 正确 {Object.values(results).filter(Boolean).length}
          </p>
        </div>
      )}
    </div>
  );
}
