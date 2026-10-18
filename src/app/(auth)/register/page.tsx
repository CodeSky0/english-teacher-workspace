import { allowRegister } from "@/server/auth/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import RegisterForm from "./register-form";
import { AuthBrandPanel } from "@/components/layout/auth-brand-panel";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen">
      <AuthBrandPanel />
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-6 lg:p-12 texture-suminagashi">
        <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-primary/8 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-[#3d6896]/8 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 grid-veil opacity-40" />
        <div className="relative w-full max-w-md animate-fade-in-up">
          {allowRegister ? (
            <RegisterForm />
          ) : (
            <Card className="w-full shadow-paper-lg">
              <CardHeader className="gap-2 pb-5">
                <CardTitle className="font-serif text-xl">注册已关闭</CardTitle>
                <CardDescription>管理员已关闭新用户注册</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divider-ink mb-4" />
                <p className="text-center text-sm text-muted">
                  已有账户？{" "}
                  <Link href="/login" className="font-medium text-neutral-7 underline-offset-4 hover:text-primary hover:underline transition-colors duration-[var(--dur-quick)]">
                    去登录
                  </Link>
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
