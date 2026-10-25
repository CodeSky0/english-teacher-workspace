import { allowRegister } from "@/server/auth/auth";
import Link from "next/link";
import RegisterForm from "./register-form";
import { AuthBrandPanel } from "@/components/layout/auth-brand-panel";
import { AuthAtmosphere, AuthRings } from "@/components/layout/auth-atmosphere";
import { AuthMobileHero } from "@/components/layout/auth-mobile-hero";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen">
      <AuthBrandPanel />
      <div className="relative flex min-h-screen flex-1 items-start justify-center overflow-hidden px-5 py-10 sm:px-8 lg:items-center lg:px-14">
        <AuthAtmosphere variant="form" />
        <AuthRings />
        {/* 斜线组：呼应「一笔笺」 */}
        <div
          className="pointer-events-none absolute -left-10 bottom-[15%] hidden h-44 w-44 opacity-[0.06] lg:block"
          style={{ backgroundImage: "repeating-linear-gradient(135deg, #5c5a55 0 1px, transparent 1px 10px)" }}
        />
        {/* 朱印：给卡片一个落点 */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[12%] right-[8%] hidden h-14 w-14 rotate-[-8deg] items-center justify-center rounded-lg border-2 border-[#a64953]/30 bg-[#a64953]/[0.05] font-serif text-[13px] tracking-[0.2em] text-[#a64953]/55 lg:flex"
        >
          和風
        </span>
        {/* 英文水印 */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-10 right-0 hidden select-none font-display text-[9rem] font-semibold leading-none tracking-tight text-[#24231f]/[0.045] md:block"
        >
          English
        </span>
        <div className="relative z-10 w-full max-w-[23rem] animate-fade-in-up">
          {/* 卡上落点：小朱印 + 细线（仅桌面，移动端由深色 Hero 承担） */}
          <div className="mb-5 hidden items-center justify-center gap-3 lg:flex">
            <span className="h-px w-10 bg-[linear-gradient(90deg,transparent,rgba(166,73,83,0.4))]" />
            <span className="flex h-9 w-9 rotate-[-6deg] items-center justify-center rounded-md border-2 border-[#a64953]/45 bg-[#a64953]/[0.06] font-serif text-[13px] font-semibold text-[#a64953]/85">
              英
            </span>
            <span className="h-px w-10 bg-[linear-gradient(90deg,rgba(166,73,83,0.4),transparent)]" />
          </div>
          <AuthMobileHero />
          <div className="relative z-10 -mt-12 lg:mt-0">
            {allowRegister ? (
              <RegisterForm />
            ) : (
              <div className="spotlight relative overflow-hidden rounded-[26px] border border-[#ddd7ca]/80 bg-[linear-gradient(158deg,rgba(255,255,255,0.96)_0%,rgba(255,255,255,0.88)_52%,rgba(253,251,247,0.82)_100%)] p-6 shadow-paper-float backdrop-blur-xl sm:p-8">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,rgba(197,100,115,0)_0%,rgba(197,100,115,0.55)_28%,rgba(61,104,150,0.32)_62%,rgba(94,159,126,0.18)_100%)]" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(120%_100%_at_28%_0%,rgba(255,255,255,0.95),transparent)]" />
                <div className="relative">
                  <p className="eyebrow text-[9px] text-neutral-5">Registration Closed</p>
                  <h1 className="mt-1.5 font-serif text-[24px] font-semibold tracking-tight text-text">注册已关闭</h1>
                  <p className="mt-1.5 text-[13px] text-muted">管理员已关闭新用户注册。</p>
                  <div className="divider-ink my-5" />
                  <p className="text-center text-sm text-muted">
                    已有账户？{" "}
                    <Link
                      href="/login"
                      className="font-medium text-neutral-7 underline-offset-4 transition-colors duration-[var(--dur-quick)] hover:text-primary hover:underline"
                    >
                      去登录
                    </Link>
                  </p>
                </div>
              </div>
            )}
          </div>
          <p className="mt-5 text-center font-serif text-[13px] tracking-wide text-neutral-6">
            愿你每一堂课，都值得被记住。
          </p>
          <p className="mt-2 text-center text-[10px] uppercase tracking-[0.22em] text-neutral-5">
            Yohaku · English Teacher Workspace
          </p>
        </div>
      </div>
    </div>
  );
}