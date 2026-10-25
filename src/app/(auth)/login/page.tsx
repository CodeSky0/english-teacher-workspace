import { allowRegister } from "@/server/auth/auth";
import LoginForm from "./login-form";
import { AuthBrandPanel } from "@/components/layout/auth-brand-panel";
import { AuthAtmosphere, AuthRings } from "@/components/layout/auth-atmosphere";
import { AuthMobileHero } from "@/components/layout/auth-mobile-hero";

export default function LoginPage() {
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
            <LoginForm allowRegister={allowRegister} />
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