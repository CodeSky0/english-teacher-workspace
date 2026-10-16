import { allowRegister } from "@/server/auth/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import RegisterForm from "./register-form";
import { AuthBrandPanel } from "@/components/layout/auth-brand-panel";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen bg-bg">
      <AuthBrandPanel />
      <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md animate-fade-in-up">
          {allowRegister ? (
            <RegisterForm />
          ) : (
            <Card className="w-full border-line/70 shadow-paper-md">
              <CardHeader>
                <CardTitle className="text-xl">注册已关闭</CardTitle>
                <CardDescription>管理员已关闭新用户注册</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mt-4 text-center text-sm text-muted">
                  已有账户？{" "}
                  <Link href="/login" className="text-primary hover:underline">
                    登录
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
