"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useCurrentClass } from "@/hooks/use-classes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dices, Trophy, Timer, Tag, Vote, Grid3x3, Layers, Headphones, X, Plus, Minus, RotateCcw, ChevronLeft, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";
import { cn } from "@/lib/utils";
import { NebulaRollCall } from "@/components/classroom/nebula-rollcall";

export const dynamic = "force-dynamic";

type Student = { id: string; name: string; enName: string | null; seatNo: number | null };
type VocabWord = { id: string; word: string; meaning: string | null; phoneticUs: string | null };
type VocabUnit = { id: string; name: string };

const TOOLS = [
  { id: "rollcall", name: "随机点名", icon: Dices, color: "var(--c-listen)", bg: "var(--c-listen-bg)" },
  { id: "points", name: "小组积分", icon: Trophy, color: "var(--c-exam)", bg: "var(--c-exam-bg)" },
  { id: "timer", name: "课堂计时器", icon: Timer, color: "var(--c-grammar)", bg: "var(--c-grammar-bg)" },
  { id: "feedback", name: "学生评价", icon: Tag, color: "var(--c-vocab)", bg: "var(--c-vocab-bg)" },
  { id: "poll", name: "课堂投票", icon: Vote, color: "var(--c-speak)", bg: "var(--c-speak-bg)" },
  { id: "attendance", name: "座位考勤", icon: Grid3x3, color: "var(--c-read)", bg: "var(--c-read-bg)" },
  { id: "wordcard", name: "单词卡", icon: Layers, color: "var(--c-homework)", bg: "var(--c-homework-bg)" },
  { id: "dictation", name: "听写训练", icon: Headphones, color: "var(--c-write)", bg: "var(--c-write-bg)" },
] as const;

/** 分段控件：替代朴素的圆角按钮组 */
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
    <div className="inline-flex rounded-lg border border-line/70 bg-neutral-2/55 p-0.5 shadow-[inset_0_1px_2px_rgba(36,35,31,0.05)]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-[0.4rem] px-3 py-1 text-sm transition-all duration-[var(--dur-quick)] ease-[var(--ease-smooth)]",
            value === o.value
              ? "bg-white font-medium text-text shadow-[0_1px_2px_rgba(36,35,31,0.10),inset_0_1px_0_rgba(255,255,255,0.9)]"
              : "text-muted hover:text-text"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** 舞台：投影区的大卡片，带光晕与稿纸纹理 */
function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mb-8 flex min-h-[220px] items-center justify-center overflow-hidden rounded-2xl border border-line/70 bg-gradient-to-b from-white to-[#fcfbf9] px-6 py-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_10px_-3px_rgba(36,35,31,0.10)]">
      <div className="pointer-events-none absolute inset-0 grid-veil opacity-50" />
      <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-[#3d6896]/10 blur-3xl" />
      <div className="relative">{children}</div>
    </div>
  );
}

export default function ClassroomPage() {
  const router = useRouter();
  const [activeTool, setActiveTool] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") { if (activeTool) setActiveTool(null); else router.push("/dashboard/overview"); } };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [router, activeTool]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line/70 glass px-6">
        <div className="flex items-center gap-3">
          {activeTool && (
            <button
              onClick={() => setActiveTool(null)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors duration-[var(--dur-quick)] hover:bg-neutral-3/60 hover:text-text"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <h1 className="font-serif text-lg font-semibold tracking-tight">
            {activeTool ? TOOLS.find((t) => t.id === activeTool)?.name : "课堂互动"}
          </h1>
        </div>
        <button
          onClick={() => router.push("/dashboard/overview")}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted transition-colors duration-[var(--dur-quick)] hover:bg-neutral-3/60 hover:text-text"
        >
          <X className="h-4 w-4" />退出 (Esc)
        </button>
      </header>

      <div className="flex flex-1 items-center justify-center p-6">
        {!activeTool ? (
          <div className="grid w-full max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={[
                    "group relative flex flex-col items-center gap-3 overflow-hidden rounded-xl",
                    "border border-line/60 bg-gradient-to-b from-white to-[#fcfbf9] p-6",
                    "shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
                    "transition-all duration-[var(--dur-smooth)] ease-[var(--ease-smooth)]",
                    "hover:-translate-y-[3px] hover:border-line hover:shadow-paper-lg",
                  ].join(" ")}
                >
                  {/* 悬浮时浮出的主题色光斑 */}
                  <div
                    className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-[var(--dur-smooth)] group-hover:opacity-30"
                    style={{ background: tool.color }}
                  />
                  <div
                    className="relative flex h-14 w-14 items-center justify-center rounded-xl ring-1 ring-inset ring-black/[0.04] transition-transform duration-[var(--dur-quick)] ease-[var(--ease-spring)] group-hover:scale-110"
                    style={{ background: tool.bg, color: tool.color }}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                  <span className="relative text-sm font-medium">{tool.name}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="w-full max-w-3xl animate-fade-in-up">
            {activeTool === "rollcall" && <RollCallTool />}
            {activeTool === "points" && <PointsTool />}
            {activeTool === "timer" && <TimerTool />}
            {activeTool === "feedback" && <FeedbackTool />}
            {activeTool === "poll" && <PollTool />}
            {activeTool === "attendance" && <AttendanceTool />}
            {activeTool === "wordcard" && <WordCardTool />}
            {activeTool === "dictation" && <DictationTool />}
          </div>
        )}
      </div>
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
        const final = rollPool[Math.floor(Math.random() * rollPool.length)];
        setPicked(final);
        setRolling(false);
        setHistory((h) => [...h, final]);
      }
    }, 70);
  }, [rollPool, noRepeat]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); roll(); } };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [roll]);

  if (!currentClass) return <p className="text-center text-muted">请先选择班级</p>;
  if (students.length === 0) return <p className="text-center text-muted">暂无学生</p>;

  return (
    <div className="text-center">
      <div className="mb-5">
        <Segmented
          options={[
            { value: "noRepeat", label: "不重复模式" },
            { value: "repeat", label: "可重复模式" },
          ]}
          value={noRepeat ? "noRepeat" : "repeat"}
          onChange={(v) => setNoRepeat(v === "noRepeat")}
        />
      </div>

      <NebulaRollCall
        picked={picked}
        rolling={rolling}
        className="mb-8 rounded-2xl border border-line/70 shadow-[0_2px_10px_-3px_rgba(36,35,31,0.10)]"
      />

      <Button onClick={roll} size="lg" className="gap-2" disabled={rolling}>
        <Dices className="h-5 w-5" />{rolling ? "星核聚能…" : "唤醒星核"}
      </Button>
      {history.length > 0 && (
        <p className="mt-4 text-sm text-muted">
          已点名 <span className="font-medium tabular-nums text-text">{history.length}</span> 人
        </p>
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
      <div className="mb-4 flex gap-2">
        <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="小组名称" />
        <Button onClick={addGroup}><Plus className="h-4 w-4" /></Button>
      </div>
      <div className="space-y-3">
        {Object.entries(groups).sort((a, b) => b[1] - a[1]).map(([name, pts], i) => (
          <div
            key={name}
            className="relative flex items-center justify-between overflow-hidden rounded-xl border border-line/60 bg-gradient-to-b from-white to-[#fcfbf9] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
          >
            <div className="flex items-center gap-3">
              {/* 名次徽标：前三名高亮 */}
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-medium tabular-nums",
                  i < 3 ? "bg-gradient-to-b from-[#f8e4e7] to-[#f2d6da] text-primary-d ring-1 ring-inset ring-primary/20" : "bg-neutral-3/55 text-neutral-6"
                )}
              >
                {i + 1}
              </span>
              <span className="font-medium">{name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-serif text-2xl font-semibold tabular-nums text-primary">{pts}</span>
              <Button size="sm" variant="outline" onClick={() => adjust(name, 1)}><Plus className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" onClick={() => adjust(name, -1)}><Minus className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
        {Object.keys(groups).length === 0 && <p className="text-center text-muted">请先创建小组</p>}
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
      <div className="mb-5">
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
          <Input type="number" value={target} onChange={(e) => { const v = parseInt(e.target.value) || 0; setTarget(v); setRemaining(v); }} className="w-24" />
          <span className="text-sm text-muted">秒</span>
        </div>
      )}
      <Stage>
        <div className={cn("font-serif text-7xl font-semibold tabular-nums tracking-tight text-primary", running && "animate-breathe")}>
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </div>
      </Stage>
      <div className="flex justify-center gap-2">
        {!running ? <Button onClick={start} size="lg">开始</Button> : <Button onClick={() => setRunning(false)} variant="outline" size="lg">暂停</Button>}
        <Button onClick={reset} variant="outline" size="lg" className="gap-1.5"><RotateCcw className="h-4 w-4" />重置</Button>
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
      <select
        value={selectedStudent ?? ""}
        onChange={(e) => setSelectedStudent(e.target.value)}
        className="mb-5 h-10 w-full rounded-lg border border-line bg-gradient-to-b from-white to-[#faf9f7] px-3 text-sm shadow-[inset_0_1px_2px_rgba(36,35,31,0.045)] focus-visible:outline-none focus-visible:border-primary/55"
      >
        <option value="">选择学生…</option>
        {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {TAGS.map((tag) => {
          const negative = tag.includes("需要") || tag.includes("走神");
          return (
            <Button
              key={tag}
              variant="outline"
              disabled={!selectedStudent}
              onClick={() => addFeedbackMut.mutate({ studentId: selectedStudent, tag, classId: currentClass?.id, type: negative ? "negative" : "positive" })}
            >
              {tag}
            </Button>
          );
        })}
      </div>
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
          <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="投票问题" />
          {options.map((opt, i) => <div key={i} className="flex gap-2"><Input value={opt} onChange={(e) => { const o = [...options]; o[i] = e.target.value; setOptions(o); }} placeholder={`选项 ${i + 1}`} /></div>)}
          <Button variant="outline" size="sm" onClick={() => { setOptions([...options, ""]); setVotes([...votes, 0]); }}><Plus className="h-4 w-4" />添加选项</Button>
          <Button onClick={() => setStarted(true)} disabled={!question.trim()}>开始投票</Button>
        </div>
      ) : (
        <div>
          <h3 className="mb-4 text-center text-lg font-semibold">{question}</h3>
          <div className="space-y-3">
            {options.filter((o) => o.trim()).map((opt, i) => {
              const total = votes.reduce((a, b) => a + b, 0) || 1;
              const pct = (votes[i] / total) * 100;
              return (
                <div
                  key={i}
                  className="rounded-xl border border-line/60 bg-gradient-to-b from-white to-[#fcfbf9] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium">{opt}</span>
                    <span className="font-serif text-lg font-semibold tabular-nums text-primary">{votes[i]}</span>
                  </div>
                  {/* 进度条：梅色渐变，带圆角与内阴影 */}
                  <div className="h-2 overflow-hidden rounded-full bg-neutral-3/60 shadow-[inset_0_1px_2px_rgba(36,35,31,0.06)]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#cd6c7a] to-[#a85463] transition-[width] duration-[var(--dur-slow)] ease-[var(--ease-smooth)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { const v = [...votes]; v[i]++; setVotes(v); }}><Plus className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={() => { const v = [...votes]; v[i] = Math.max(0, v[i] - 1); setVotes(v); }}><Minus className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
          <Button variant="outline" className="mt-4" onClick={() => { setStarted(false); setVotes(votes.map(() => 0)); }}>重新编辑</Button>
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
    unrecorded: "border-line/60 bg-gradient-to-b from-white to-[#fcfbf9]",
    present: "border-[#5e9f7e]/35 bg-gradient-to-b from-[#e4f0e8] to-[#d5e8dc]",
    absent: "border-[#a64953]/30 bg-gradient-to-b from-[#f7dfe0] to-[#f0cfd1]",
    late: "border-[#a87a3d]/30 bg-gradient-to-b from-[#f7ecda] to-[#f0e0c4]",
    leave: "border-[#3d6896]/30 bg-gradient-to-b from-[#e3ecf4] to-[#d3e0ec]",
  };
  const STATUS_TEXT: Record<string, string> = {
    unrecorded: "text-neutral-7",
    present: "text-[#3d7a5e]",
    absent: "text-[#a64953]",
    late: "text-[#8a6230]",
    leave: "text-[#3d6896]",
  };
  const saveMut = useMutation({ mutationFn: (d: Record<string, unknown>) => apiClient.post("/classroom/attendance", { ...d, classId: currentClass?.id, attendanceDate: today }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["attendance"] }); toast.success("已保存"); }, onError: (e: unknown) => toast.error(getErrorMessage(e)) });

  const sorted = [...students].sort((a, b) => (a.seatNo ?? 999) - (b.seatNo ?? 999));

  return (
    <div>
      <p className="mb-4 text-center text-sm text-muted">{today} · 点击切换状态</p>
      <div className="grid grid-cols-4 gap-2 md:grid-cols-6">
        {sorted.map((s) => {
          const status = statusMap[s.id] ?? "unrecorded";
          return (
            <button
              key={s.id}
              onClick={() => { const idx = STATUSES.indexOf(status); const next = STATUSES[(idx + 1) % STATUSES.length]; setStatusMap({ ...statusMap, [s.id]: next }); saveMut.mutate({ studentId: s.id, status: next }); }}
              className={cn(
                "rounded-xl border p-3 text-center transition-all duration-[var(--dur-quick)] ease-[var(--ease-smooth)]",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] hover:-translate-y-[2px] hover:shadow-paper-sm",
                STATUS_STYLE[status]
              )}
            >
              <p className="text-sm font-medium">{s.name}</p>
              <p className="text-xs text-muted">{s.seatNo ?? "—"}</p>
              <p className={cn("mt-1 text-xs font-medium", STATUS_TEXT[status])}>{STATUS_LABEL[status]}</p>
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
  const order = randomOrder ? [...words].sort(() => Math.random() - 0.5) : words;
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

  function speak(text: string) { if ("speechSynthesis" in window) { const u = new SpeechSynthesisUtterance(text); u.lang = "en-US"; speechSynthesis.speak(u); } }

  return (
    <div className="text-center">
      {!selectedUnit ? (
        <div className="space-y-2">
          {units.map((u) => <Button key={u.id} variant="outline" className="w-full" onClick={() => { setSelectedUnit(u.id); setIndex(0); }}>{u.name}</Button>)}
        </div>
      ) : !current ? <p className="text-muted">暂无单词</p> : (
        <div>
          <div className="mb-5 flex justify-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setSelectedUnit(null)}>选择单元</Button>
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
            className="relative mb-6 flex min-h-[240px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-line/70 bg-gradient-to-b from-white to-[#fcfbf9] px-6 py-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_10px_-3px_rgba(36,35,31,0.10)] transition-transform duration-[var(--dur-quick)] hover:-translate-y-[2px]"
          >
            <div className="pointer-events-none absolute inset-0 grid-veil opacity-50" />
            <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[#7c3aed]/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative">
              {flipped ? (
                <div className="animate-scale-in">
                  <p className="text-3xl font-medium">{current.meaning}</p>
                  {current.phoneticUs && <p className="mt-2.5 text-lg text-muted">/{current.phoneticUs}/</p>}
                </div>
              ) : (
                <p className="font-serif text-6xl font-semibold tracking-tight text-primary">{current.word}</p>
              )}
            </div>
          </div>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => { setIndex(Math.max(index - 1, 0)); setFlipped(false); }}>上一张</Button>
            <Button variant="outline" onClick={() => speak(current.word)} className="gap-1.5"><Volume2 className="h-4 w-4" />朗读</Button>
            <Button variant="outline" onClick={() => { setIndex(Math.min(index + 1, order.length - 1)); setFlipped(false); }}>下一张</Button>
          </div>
          <p className="mt-4 text-sm text-muted tabular-nums">{index + 1} / {order.length}</p>
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

  function speak(text: string) { if ("speechSynthesis" in window) { const u = new SpeechSynthesisUtterance(text); u.lang = "en-US"; speechSynthesis.speak(u); } }

  return (
    <div className="text-center">
      {!selectedList ? (
        <div className="space-y-2">{lists.map((l) => <Button key={l.id} variant="outline" className="w-full" onClick={() => { setSelectedList(l.id); setIndex(0); }}>{l.name}</Button>)}</div>
      ) : !current ? <p className="text-muted">暂无单词</p> : (
        <div>
          <Stage>
            {showWord ? (
              <p key={current.id} className="animate-scale-in font-serif text-4xl font-semibold tracking-tight text-primary">
                {current.word}
              </p>
            ) : (
              <p className="text-xl text-muted">点击朗读或显示单词</p>
            )}
          </Stage>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => speak(current.word)} className="gap-1.5"><Volume2 className="h-4 w-4" />朗读</Button>
            <Button variant="outline" onClick={() => setShowWord(!showWord)}>{showWord ? "隐藏" : "显示"}</Button>
            <Button variant="outline" onClick={() => { setResults({ ...results, [current.id]: true }); setIndex(Math.min(index + 1, words.length - 1)); setShowWord(false); }}>正确</Button>
            <Button variant="outline" onClick={() => { setResults({ ...results, [current.id]: false }); setIndex(Math.min(index + 1, words.length - 1)); setShowWord(false); }}>错误</Button>
          </div>
          <p className="mt-4 text-sm text-muted tabular-nums">
            {index + 1} / {words.length} · 正确 {Object.values(results).filter(Boolean).length}
          </p>
        </div>
      )}
    </div>
  );
}
