"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";

const TEMPLATES = [
  { key: "objectives", name: "教学目标草稿", desc: "生成教学目标框架" },
  { key: "process", name: "教学过程模板", desc: "生成教学过程设计" },
  { key: "reading", name: "阅读课活动设计", desc: "阅读教学活动方案" },
  { key: "listening", name: "听说课活动设计", desc: "听说教学活动方案" },
  { key: "vocab", name: "词汇练习草稿", desc: "词汇练习活动设计" },
  { key: "evaluation", name: "课堂评价语言", desc: "课堂用语参考" },
  { key: "remark", name: "学生评语草稿", desc: "学生评价语生成" },
  { key: "reflection", name: "教学反思框架", desc: "教学反思模板" },
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
    navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success("已复制");
    setTimeout(() => setCopied(false), 2000);
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
      <PageHeader title="AI 助手" description="生成教案、优化活动、生成练习和评语" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <Card>
            <CardHeader><CardTitle className="text-base">模板生成</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((t) => (
                  <button key={t.key} onClick={() => generateMut.mutate(t.key)} disabled={generateMut.isPending}
                    className="rounded-lg border border-line p-3 text-left hover:bg-bg/50 disabled:opacity-50">
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted">{t.desc}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader><CardTitle className="text-base">= AI 对话</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-3 max-h-48 space-y-2 overflow-y-auto">
                {messages.map((m, i) => (
                  <div key={i} className={`rounded-md p-2 text-sm ${m.role === "user" ? "bg-primary-l text-primary-d" : "bg-bg"}`}>
                    <span className="font-medium">{m.role === "user" ? "我" : "AI"}：</span>{m.content}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="输入问题…" rows={2} className="flex-1" />
                <Button onClick={handleChat} disabled={chatMut.isPending || !chatInput.trim()}>{chatMut.isPending ? "…" : "发送"}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">生成结果</CardTitle>
                {result && <div className="flex items-center gap-2">
                  {isTemplate && <Badge variant="muted">模板生成</Badge>}
                  <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5">
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-6 w-3.5" />}{copied ? "已复制" : "复制"}
                  </Button>
                </div>}
              </div>
            </CardHeader>
            <CardContent>
              {result ? (
                <pre className="whitespace-pre-wrap text-sm text-text">{result}</pre>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted">
                  <Sparkles className="mb-2 h-8 w-8" />
                  <p className="text-sm">选择模板或输入问题开始生成</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
