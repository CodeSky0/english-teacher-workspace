/**
 * 移动端登录 / 注册页的「墨色极光」头部
 *
 * lg 以下品牌面板隐藏，用一块全出血的深色墨块承载品牌与大幅英文标语，
 * 下方玻璃卡向上叠压，形成「深色墨块 + 浅色纸面」的对角层次。
 */
export function AuthMobileHero() {
  return (
    <div className="relative -mx-5 -mt-10 mb-0 overflow-hidden rounded-b-[2.25rem] px-5 pb-20 pt-9 sm:-mx-8 lg:hidden">
      {/* 墨色底 + 极光 */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(152deg,#241a24_0%,#38202f_26%,#472a3a_44%,#332547_66%,#20303e_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_14%_6%,rgba(206,96,118,0.55)_0%,transparent_70%),radial-gradient(ellipse_55%_45%_at_86%_40%,rgba(176,124,58,0.28)_0%,transparent_72%),radial-gradient(ellipse_60%_50%_at_52%_96%,rgba(61,104,150,0.45)_0%,transparent_72%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:28px_28px]" />
      {/* 同心圆轨道 */}
      <svg
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 text-white/[0.10]"
        viewBox="0 0 200 200"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="100" cy="100" r="94" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="100" cy="100" r="70" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 7" />
        <circle cx="100" cy="100" r="44" stroke="currentColor" strokeWidth="0.5" />
        <line x1="4" y1="100" x2="196" y2="100" stroke="currentColor" strokeWidth="0.3" />
        <line x1="100" y1="4" x2="100" y2="196" stroke="currentColor" strokeWidth="0.3" />
      </svg>
      {/* 英文水印 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-5 right-1 select-none font-display text-[5.5rem] font-semibold leading-none tracking-tight text-white/[0.07]"
      >
        English
      </span>

      <div className="relative">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#e08a96_0%,#c56473_46%,#a64953_100%)] shadow-[0_4px_14px_-3px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.4)] ring-1 ring-white/25">
            <span className="pointer-events-none absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_30%_16%,rgba(255,255,255,0.6),transparent_58%)] opacity-70" />
            <span className="relative font-serif text-[15px] font-medium text-white">英</span>
            <span className="pointer-events-none absolute inset-[3px] rounded-[0.6rem] border border-white/25" />
          </span>
          <div className="min-w-0">
            <span className="block font-serif text-[15px] tracking-wide text-white/95">英语教师工作台</span>
            <span className="eyebrow mt-0.5 block text-[8.5px] text-white/50">Yohaku · English Atelier</span>
          </div>
        </div>

        <p className="mt-6 font-display text-[44px] font-medium leading-[0.94] tracking-[-0.02em] text-white">
          Teach
          <br />
          <span className="bg-[linear-gradient(112deg,#f7cfd5_0%,#e7b9c9_34%,#cbb8e6_68%,#a7c8e4_100%)] bg-clip-text italic text-transparent">
            beautifully.
          </span>
        </p>
        <p className="mt-3 font-serif text-[13.5px] tracking-wide text-white/70">
          把每一堂英语课，教成一束光。
        </p>
      </div>
    </div>
  );
}
