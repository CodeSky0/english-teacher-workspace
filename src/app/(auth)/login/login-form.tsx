"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";

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
    <Card className="w-full border-line/70 shadow-paper-lg">
      <CardHeader className="space-y-2">
        {/* 移动端品牌标识 */}
        <div className="flex items-center gap-2.5 lg:hidden">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#a64953] text-sm font-medium text-white shadow-glow">
            英
          </span>
          <span className="font-serif text-base font-medium tracking-wide text-neutral-9">
            英语教师工作台
          </span>
        </div>
        <CardTitle className="text-2xl font-semibold tracking-tight">欢迎回来</CardTitle>
        <CardDescription className="text-copy-14">登录你的账户，继续教学工作</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-4" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@example.com"
                required
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">密码</Label>
              <button type="button" className="text-xs text-neutral-5 hover:text-primary transition-colors duration-[var(--dur-quick)]">
                忘记密码？
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-4" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                required
                className="pl-9"
              />
            </div>
          </div>
          <Button type="submit" className="relative w-full h-10 overflow-hidden" disabled={loading}>
            <span className="btn-glow-sweep absolute inset-0" />
            <span className="relative">{loading ? "登录中…" : "登录"}</span>
          </Button>
        </form>
        {allowRegister && (
          <p className="mt-6 text-center text-sm text-muted">
            还没有账户？{" "}
            <Link href="/register" className="font-medium text-neutral-7 hover:text-primary transition-colors duration-[var(--dur-quick)]">
              注册
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
