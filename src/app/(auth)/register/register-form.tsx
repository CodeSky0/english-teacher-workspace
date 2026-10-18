"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";
import { User, Mail, Lock } from "lucide-react";

/** 输入框左侧的图标槽：小色块容器，比裸图标更整齐 */
function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md bg-neutral-3/55 text-neutral-6">
      {children}
    </span>
  );
}

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
    <Card className="w-full shadow-paper-lg">
      <CardHeader className="gap-2 pb-5">
        <div className="mb-1 flex items-center gap-2.5 lg:hidden">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#cd6c7a] to-[#a64953] text-sm font-medium text-white shadow-[0_2px_6px_-1px_rgba(168,84,99,0.5),inset_0_1px_0_rgba(255,255,255,0.35)]">
            英
          </span>
          <span className="font-serif text-base font-medium tracking-wide text-neutral-9">
            英语教师工作台
          </span>
        </div>
        <CardTitle className="font-serif text-2xl font-semibold tracking-tight">创建账户</CardTitle>
        <CardDescription className="text-copy-14">开始使用英语教师工作台</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">姓名</Label>
            <div className="relative">
              <FieldIcon>
                <User className="h-3.5 w-3.5" />
              </FieldIcon>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="你的姓名"
                required
                className="pl-10"
              />
            </div>
          </div>
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
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <div className="relative">
              <FieldIcon>
                <Lock className="h-3.5 w-3.5" />
              </FieldIcon>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位"
                minLength={6}
                required
                className="pl-10"
              />
            </div>
          </div>
          <Button
            type="submit"
            className="relative mt-1 h-10 w-full overflow-hidden text-[15px]"
            disabled={loading}
          >
            <span className="btn-glow-sweep absolute inset-0" />
            <span className="relative">{loading ? "注册中…" : "注册"}</span>
          </Button>
        </form>
        <div className="mt-6">
          <div className="divider-ink mb-4" />
          <p className="text-center text-sm text-muted">
            已有账户？{" "}
            <Link href="/login" className="font-medium text-neutral-7 underline-offset-4 hover:text-primary hover:underline transition-colors duration-[var(--dur-quick)]">
              去登录
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
