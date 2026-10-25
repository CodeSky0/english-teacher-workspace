"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { toast } from "sonner";
import Link from "next/link";
import { Mail, Lock, ArrowRight } from "lucide-react";

/** 输入框左侧的图标槽：玻璃小方块，比裸图标更整齐 */
function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg border border-white/70 bg-white/70 text-neutral-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
      {children}
    </span>
  );
}

export default function LoginForm({ allowRegister }: { allowRegister: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authClient.signIn.email({ email, password });
      if (res.error) {
        toast.error(res.error.message || "登录失败");
      } else {
        toast.success("登录成功");
        router.push("/dashboard/overview");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="spotlight relative overflow-hidden rounded-[26px] border border-[#ddd7ca]/80 bg-[linear-gradient(158deg,rgba(255,255,255,0.96)_0%,rgba(255,255,255,0.88)_52%,rgba(253,251,247,0.82)_100%)] p-6 shadow-paper-float backdrop-blur-xl sm:p-8">
      {/* 顶部三色极细光带：玻璃卡的品牌端点 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,rgba(197,100,115,0)_0%,rgba(197,100,115,0.55)_28%,rgba(61,104,150,0.32)_62%,rgba(94,159,126,0.18)_100%)]" />
      {/* 釉面高光与角落极光 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(120%_100%_at_28%_0%,rgba(255,255,255,0.95),transparent)]" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(197,100,115,0.16),transparent_70%)]" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(61,104,150,0.10),transparent_72%)]" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.95),transparent)]" />

      <div className="relative">
        <p className="eyebrow text-[9px] text-neutral-5">Welcome Back</p>
        <h1 className="mt-1.5 font-serif text-[27px] font-semibold tracking-tight text-text">欢迎回来</h1>
        <p className="mt-1.5 text-[13px] text-muted">登录你的账户，继续今天的教学。</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <div className="relative">
              <FieldIcon>
                <Mail className="h-3.5 w-3.5" />
              </FieldIcon>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@example.com"
                required
                className="h-10 rounded-xl pl-11"
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">密码</Label>
              <button
                type="button"
                className="text-xs text-neutral-5 transition-colors duration-[var(--dur-quick)] hover:text-primary"
              >
                忘记密码？
              </button>
            </div>
            <div className="relative">
              <FieldIcon>
                <Lock className="h-3.5 w-3.5" />
              </FieldIcon>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                required
                className="h-10 rounded-xl pl-11"
              />
            </div>
          </div>
          <Button
            type="submit"
            className="group relative mt-1 h-11 w-full overflow-hidden text-[15px] shadow-glow"
            disabled={loading}
          >
            <span className="btn-glow-sweep absolute inset-0" />
            <span className="relative flex items-center gap-2">
              {loading ? "登录中…" : "登录"}
              {!loading && (
                <ArrowRight className="h-4 w-4 transition-transform duration-[var(--dur-quick)] group-hover:translate-x-0.5" />
              )}
            </span>
          </Button>
        </form>

        {allowRegister && (
          <div className="mt-6">
            <div className="divider-ink mb-4" />
            <p className="text-center text-sm text-muted">
              还没有账户？{" "}
              <Link
                href="/register"
                className="font-medium text-neutral-7 underline-offset-4 transition-colors duration-[var(--dur-quick)] hover:text-primary hover:underline"
              >
                立即注册
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}