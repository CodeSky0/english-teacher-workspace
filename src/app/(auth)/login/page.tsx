import { allowRegister } from "@/server/auth/auth";
import LoginForm from "./login-form";
import { AuthBrandPanel } from "@/components/layout/auth-brand-panel";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      <AuthBrandPanel />
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-6 lg:p-12 texture-suminagashi">
        {/* 光晕装饰，平衡视觉权重 */}
        <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-primary/8 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-[#3d6896]/8 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 grid-veil opacity-40" />
        <div className="relative w-full max-w-md animate-fade-in-up">
          <LoginForm allowRegister={allowRegister} />
        </div>
      </div>
    </div>
  );
}
