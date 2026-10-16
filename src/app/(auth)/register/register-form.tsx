"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";

export default function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authClient.signUp.email({ email, password, name });
      if (res.error) {
        toast.error(res.error.message || "注册失败");
      } else {
        toast.success("注册成功");
        router.push("/dashboard/overview");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full border-line/70 shadow-paper-md">
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2.5 lg:hidden">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#a64953] text-sm font-medium text-white shadow-glow">
            英
          </span>
          <span className="font-serif text-base font-medium tracking-wide text-neutral-9">
            英语教师工作台
          </span>
        </div>
        <CardTitle className="text-2xl font-semibold tracking-tight">创建账户</CardTitle>
        <CardDescription className="text-copy-14">开始使用英语教师工作台</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">姓名</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="你的姓名"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
              minLength={6}
              required
            />
          </div>
          <Button type="submit" className="w-full h-10" disabled={loading}>
            {loading ? "注册中…" : "注册"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          已有账户？{" "}
          <Link href="/login" className="font-medium text-primary hover:underline transition-colors duration-[var(--dur-quick)]">
            登录
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
