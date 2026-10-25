"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Copy, Check, Target, ListChecks, BookOpen, Headphones, SpellCheck,
  MessageSquareQuote, PenLine, Lightbulb, Send, ArrowUpRight, Bot, Quote,
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";
import { cn } from "@/lib/utils";

const TEMPLATES = [
  { key: "objectives", name: "教学目标草稿", desc: "生成教学目标框架", icon: Target, color: "#b8556a", tile: "linear-gradient(160deg,#faeef0,#f3dde1)" },
  { key: "process", name: "教学过程模板", desc: "生成教学过程设计", icon: ListChecks, color: "#3d6896", tile: "linear-gradient(160deg,#e9f1f8,#d5e3f0)" },
  { key: "reading", name: "阅读课活动设计", desc: "阅读教学活动方案", icon: BookOpen, color: "#4a8f74", tile: "linear-gradient(160deg,#eaf4ee,#d9eadd)" },
  { key: "listening", name: "听说课活动设计", desc: "听说教学活动方案", icon: Headphones, color: "#8a6230", tile: "linear-gradient(160deg,#f7efe2,#efe2cd)" },
  { key: "vocab", name: "词汇练习草稿", desc: "词汇练习活动设计", icon: SpellCheck, color: "#3d6896", tile: "linear-gradient(160deg,#e9f1f8,#dbe6f1)" },
  { key: "evaluation", name: "课堂评价语言", desc: "课堂用语参考", icon: MessageSquareQuote, color: "#b8556a", tile: "linear-gradient(160deg,#faeef0,#f5e2e5)" },
  { key: "remark", name: "学生评语草稿", desc: "学生评价语生成", icon: PenLine, color: "#8a6230", tile: "linear-gradient(160deg,#f7efe2,#f2e6d4)" },
  { key: "reflection", name: "教学反思框架", desc: "教学反思模板", icon: Lightbulb, color: "#4a8f74", tile: "linear-gradient(160deg,#eaf4ee,#ddece2)" },
];

const SUGGESTIONS = [
  { icon: Target, text: "为 Unit 3 阅读课写三条可观测的教学目标" },
  { icon: Lightbulb, text: "把小组讨论改造成 8 分钟的课堂活动" },
  { icon: PenLine, text: "给学生写一段鼓励式阶段评语" },
];

export default function AiPage() {
  const [result, setResult] = useState<string>("");
  const [isTemplate, setIsTemplate] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);

  const generateMut = useMutation({
    mutationFn: (template: string) => apiClient.post<{ data: { content: string; isTemplate: boolean; note?: string } }>("/ai/generate", { template }),
    onSuccess: (res) => { setResult(res.data.content); setIsTemplate(res.data.isTemplate); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });

  const chatMut = useMutation({
    mutationFn: (msgs: Array<{ role: string; content: string }>) => apiClient.post<{ data: { content: string; isTemplate: boolean } }>("/ai/chat", { messages: msgs }),
    onSuccess: (res) => { setMessages((m) => [...m, { role: "assistant", content: res.data.content }]); setIsTemplate(res.data.isTemplate); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });

  function handleCopy() {
    try {
      navigator.clipboard?.writeText(result);
      setCopied(true);
      toast.success("已复制");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("复制失败");
    }
  }

  function handleChat() {
    if (!chatInput.trim()) return;
    const newMessages: Array<{ role: "user" | "assistant"; content: string }> = [...messages, { role: "user" as const, content: chatInput }];
    setMessages(newMessages);
    setChatInput("");
    chatMut.mutate(newMessages.map((m) => ({ role: m.role, content: m.content })));
  }

  return (
    <div>
      {/* ══════════ 深色对话头：AI 会话入口 ══════════ */}
      <section className="spotlight relative mb-4 overflow-hidden rounded-[26px] shadow-[0_2px_4px_rgba(36,35,31,0.06),0_28px_60px_-30px_rgba(44,32,74,0.55)] animate-fade-in-up">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,#2f1d33_0%,#4a2a3f_20%,#6d4350_40%,#5c4a6e_60%,#3f5878_80%,#2b4761_100%)]" />
        <div className="pointer-events-none absolute -left-20 -top-28 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(255,170,150,0.34),transparent_64%)]" />
        <div className="pointer-events-none absolute -right-20 -top-28 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,rgba(126,172,255,0.30),transparent_66%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.09] grid-veil" />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-7 right-3 hidden select-none font-display text-[7.5rem] font-semibold leading-none tracking-tight text-white/[0.07] lg:block"
        >
          Copilot
        </span>

        <div className="relative flex flex-col gap-6 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="eyebrow text-white/55">Aurora Copilot</span>
              <span className="h-3 w-px bg-white/25" />
              <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] text-white/85 backdrop-blur-sm">
                <Sparkles className="h-3 w-3" />
                本地模板引擎
              </span>
            </div>
            <h2 className="mt-3 font-serif text-[30px] font-semibold leading-[1.16] tracking-tight text-white sm:text-[36px]">
              AI 助手
            </h2>
            <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-white/70">
              生成教案、优化活动、生成练习和评语 —— 让备课少一点重复，多一点灵感。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                { icon: Target, text: "8 个教学模板" },
                { icon: Bot, text: "对话式生成" },
                { icon: Copy, text: "一键复制到教案" },
              ].map((chip) => {
                const Icon = chip.icon;
                return (
                  <span key={chip.text} className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-white/[0.08] px-2.5 py-1 text-[11px] text-white/75 backdrop-blur-sm">
                    <Icon className="h-3 w-3 text-white/55" />
                    {chip.text}
                  </span>
                );
              })}
            </div>
          </div>

          {/* 右：会话玻璃卡（示意 AI 正在待命） */}
          <div className="w-full shrink-0 rounded-2xl border border-white/25 bg-white/[0.12] p-4 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-xl lg:w-[19rem]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(150deg,#ffd9c0_0%,#e5a4b1_45%,#a9c8ff_100%)] font-display text-[10px] font-semibold text-[#3a2430] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                AI
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-white/90">Aurora 已就绪</p>
                <p className="text-[10px] text-white/50">从模板开始，或直接提问</p>
              </div>
              <span className="ml-auto flex items-center gap-1 text-[10px] text-white/50">
                <span className="h-1.5 w-1.5 rounded-full bg-[#a5d3b6] shadow-[0_0_8px_rgba(165,211,182,0.8)] animate-breathe" />
                online
              </span>
            </div>
            <div className="mt-3 space-y-2">
              <p className="ml-auto w-fit max-w-[85%] rounded-xl rounded-br-[5px] bg-white/[0.16] px-2.5 py-1.5 text-[11px] leading-relaxed text-white/80">
                帮我把这节阅读课改得更互动一些
              </p>
              <p className="w-fit max-w-[88%] rounded-xl rounded-bl-[5px] border border-white/15 bg-white/[0.07] px-2.5 py-1.5 text-[11px] leading-relaxed text-white/70">
                可以，从「读前预测 → 拼图阅读 → 读后展示」三个环节切入…
              </p>
            </div>
          </div>
        </div>
      </section>


      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.28fr)_minmax(0,0.86fr)]">
        {/* ───────────── 左：模板 + 对话 ───────────── */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="eyebrow">Templates</p>
                  <CardTitle className="mt-1.5 flex items-center gap-2.5 text-[17px]">
                    <span className="icon-slot"><Sparkles /></span>
                    模板生成
                  </CardTitle>
                </div>
                <span className="text-[11px] text-muted">横向滑动 · 共 8 个</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                {TEMPLATES.map((t, i) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.key}
                      onClick={() => generateMut.mutate(t.key)}
                      disabled={generateMut.isPending}
                      style={{ "--i": i } as React.CSSProperties}
                      className={cn(
                        "group relative w-[9.75rem] shrink-0 overflow-hidden rounded-xl border border-white/70 p-3 text-left",
                        "bg-[linear-gradient(168deg,rgba(255,255,255,0.92),rgba(250,248,244,0.72))]",
                        "shadow-[0_1px_2px_rgba(36,35,31,0.05),inset_0_1px_0_rgba(255,255,255,0.95)]",
                        "transition-all duration-[var(--dur-smooth)] ease-[var(--ease-smooth)]",
                        "hover:-translate-y-[2px] hover:border-primary/20 hover:shadow-paper-md disabled:opacity-50",
                        "stagger"
                      )}
                    >
                      <span className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-0 blur-2xl transition-opacity duration-[var(--dur-smooth)] group-hover:opacity-60" style={{ background: t.color }} />
                      <span className="relative flex items-center gap-2">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ring-1 ring-inset ring-black/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-transform duration-[var(--dur-quick)] ease-[var(--ease-spring)] group-hover:scale-105"
                          style={{ background: t.tile, color: t.color }}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-medium text-text">{t.name}</span>
                          <span className="mt-0.5 block truncate text-[11px] text-muted">{t.desc}</span>
                        </span>
                      </span>
                      <ArrowUpRight className="absolute right-2.5 top-2.5 h-3 w-3 -translate-y-0.5 text-neutral-4 opacity-0 transition-all duration-[var(--dur-quick)] group-hover:translate-y-0 group-hover:opacity-70" />
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="eyebrow">Conversation</p>
                  <CardTitle className="mt-1.5 flex items-center gap-2.5 text-[17px]">
                    <span className="icon-slot"><Bot /></span>
                    AI 对话
                  </CardTitle>
                </div>
                <span className="flex items-center gap-1 text-[11px] text-muted">
                  <span className={cn("h-1.5 w-1.5 rounded-full", chatMut.isPending ? "animate-breathe bg-[#5e9f7e]" : "bg-neutral-4")} />
                  {chatMut.isPending ? "生成中" : "就绪"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <div className="mb-3 max-h-[13rem] min-h-[8.5rem] space-y-3 overflow-y-auto scrollbar-thin pr-1">
                {messages.length === 0 && !chatMut.isPending && (
                  <div className="relative overflow-hidden rounded-xl border border-dashed border-line/80 bg-[linear-gradient(170deg,rgba(255,255,255,0.6),rgba(249,247,242,0.5))] p-3.5">
                    <div className="pointer-events-none absolute inset-0 grid-veil opacity-35" />
                    <div className="relative mb-2.5 flex items-center gap-1.5 text-[11px] text-muted">
                      <Quote className="h-3 w-3 text-[#b8556a]/70" />
                      试试这样问 —— 点击填入输入框
                    </div>
                    <div className="relative space-y-1.5">
                      {SUGGESTIONS.map((s) => {
                        const Icon = s.icon;
                        return (
                          <button
                            key={s.text}
                            onClick={() => setChatInput(s.text)}
                            className="group flex w-full items-center gap-2 rounded-lg border border-white/80 bg-white/65 px-2.5 py-2 text-left text-[12px] text-neutral-7 shadow-[0_1px_2px_rgba(36,35,31,0.03)] transition-all duration-[var(--dur-quick)] hover:-translate-y-[1px] hover:border-primary/25 hover:text-text hover:shadow-paper-xs"
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[linear-gradient(160deg,#f8e4e7,#f2d6da)] text-[#a64953] ring-1 ring-inset ring-[#c56473]/15">
                              <Icon className="h-3 w-3" />
                            </span>
                            <span className="min-w-0 flex-1 truncate">{s.text}</span>
                            <ArrowUpRight className="h-3 w-3 shrink-0 text-neutral-4 transition-transform group-hover:-translate-y-0.5 group-hover:text-primary" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div key={i} className={cn("flex gap-2 animate-fade-in-up", m.role === "user" ? "justify-end" : "justify-start")}>
                    {m.role !== "user" && (
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(150deg,#d0707f_0%,#a8648a_55%,#3d6896_100%)] font-display text-[10px] font-semibold text-white shadow-[0_4px_12px_-4px_rgba(168,84,99,0.7),inset_0_1px_0_rgba(255,255,255,0.35)]">
                        AI
                      </span>
                    )}
                    <div
                      className={cn(
                        "max-w-[86%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                        m.role === "user"
                          ? "rounded-br-[6px] bg-[linear-gradient(150deg,#f8e4e7,#f2d6da)] text-primary-d shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_2px_8px_-5px_rgba(168,84,99,0.4)] ring-1 ring-inset ring-white/65"
                          : "rounded-bl-[6px] border border-white/80 bg-[linear-gradient(170deg,rgba(255,255,255,0.82),rgba(249,247,243,0.66))] text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_3px_12px_-7px_rgba(36,35,31,0.35)] backdrop-blur-sm"
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}

                {chatMut.isPending && (
                  <div className="flex gap-2 animate-fade-in">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(150deg,#d0707f_0%,#a8648a_55%,#3d6896_100%)] font-display text-[10px] font-semibold text-white shadow-[0_4px_12px_-4px_rgba(168,84,99,0.7)]">
                      AI
                    </span>
                    <div className="rounded-2xl rounded-bl-[6px] border border-white/80 bg-white/70 px-3.5 py-2.5 text-[13px] text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#c56473] animate-breathe" />
                        <span className="h-1.5 w-1.5 rounded-full bg-[#a8648a] animate-breathe" style={{ animationDelay: "-2s" }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-[#3d6896] animate-breathe" style={{ animationDelay: "-4s" }} />
                        <span className="ml-1 text-[12px]">正在组织语言</span>
                        <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-breathe rounded-full bg-[#b8556a]" />
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 z-[2] mt-auto flex items-end gap-2 rounded-xl border border-white/75 bg-[linear-gradient(180deg,rgba(255,254,252,0.78),rgba(255,254,252,0.96))] px-1.5 py-1.5 shadow-[0_-6px_16px_-12px_rgba(36,35,31,0.35)] backdrop-blur-md">
                <Textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="输入问题…（Ctrl / ⌘ + Enter 发送）"
                  rows={2}
                  className="flex-1 resize-none"
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); handleChat(); }
                  }}
                />
                <Button onClick={handleChat} disabled={chatMut.isPending || !chatInput.trim()} className="h-[52px] shrink-0 gap-1.5 px-4">
                  {chatMut.isPending ? <span className="text-xs">…</span> : (<><Send className="h-4 w-4" /><span className="hidden sm:inline">发送</span></>)}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ───────────── 右：生成结果 ───────────── */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card className="flex h-full flex-col overflow-hidden xl:min-h-[26rem]">
            {/* 顶部渐变光条 */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,transparent,rgba(197,100,115,0.55),rgba(61,104,150,0.45),rgba(94,159,126,0.4),transparent)]" />
            <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(197,100,115,0.10),transparent_68%)]" />
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">Output</p>
                  <CardTitle className="mt-1.5 flex items-center gap-2.5 text-[17px]">
                    <span className="icon-slot"><Sparkles /></span>
                    生成结果
                  </CardTitle>
                </div>
                {result ? (
                  <div className="flex shrink-0 items-center gap-2">
                    {isTemplate && <Badge variant="muted" className="hidden sm:inline-flex">模板生成</Badge>}
                    <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5">
                      {copied ? <Check className="h-3.5 w-3.5 text-[#3d7a5e]" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "已复制" : "复制"}
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              {result ? (
                <div className="relative overflow-hidden rounded-xl border border-white/70 bg-[linear-gradient(170deg,rgba(255,255,255,0.86),rgba(251,249,245,0.7))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
                  <div className="pointer-events-none absolute inset-0 grid-veil opacity-25" />
                  <pre className="relative whitespace-pre-wrap font-sans text-[13px] leading-[1.85] text-text">{result}</pre>
                </div>
              ) : (
                <div className="relative flex h-full flex-col justify-center overflow-hidden rounded-xl border border-dashed border-line/70 bg-[linear-gradient(170deg,rgba(255,255,255,0.55),rgba(249,247,242,0.35))] p-4">
                  <div className="pointer-events-none absolute inset-0 grid-veil opacity-30" />
                  <div className="relative flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(160deg,#ffffff,#f4f1ec)] text-[#b8556a] ring-1 ring-inset ring-line/60">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-text">示例输出</p>
                      <p className="truncate text-[10px] text-muted">选择模板或提问后，这里会显示生成内容</p>
                    </div>
                    <span className="ml-auto shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10px] text-neutral-6 ring-1 ring-inset ring-line/70">Sample</span>
                  </div>
                  <div className="relative mt-3 space-y-1.5 rounded-lg border border-white/70 bg-white/55 p-3">
                    <p className="eyebrow text-[9px] text-[#b8556a]/75">Teaching Objectives</p>
                    <p className="text-[12px] leading-relaxed text-neutral-7">1. 学生能通过略读获取文章主旨，并用自己的话复述关键信息。</p>
                    <p className="text-[12px] leading-relaxed text-neutral-7">2. 能运用本课 6 个核心词汇描述人物性格。</p>
                    <p className="text-[12px] leading-relaxed text-neutral-7">3. 在小组讨论中倾听他人观点并补充理由。</p>
                  </div>
                  <p className="relative mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted">
                    <Sparkles className="h-3 w-3 text-[#b8556a]/60" />
                    AI 正在待命，随时开始
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
