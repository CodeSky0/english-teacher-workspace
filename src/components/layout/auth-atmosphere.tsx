/**
 * 登录 / 注册页的氛围层（纯展示，服务端组件可用）
 *
 * - panel：与总览页 Hero 同源的「墨色极光」——深色墨块上叠玫瑰 / 赭 / 紫 / 縹蓝光晕
 * - form：深暖纸面 + 暖雾，让玻璃卡有落点（不再是一片白雾）
 *
 * 全部使用径向 / 线性渐变，不使用 filter: blur；深色面不叠加 backdrop-filter。
 */
export function AuthAtmosphere({ variant = "panel" }: { variant?: "panel" | "form" }) {
  if (variant === "form") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* 深暖纸面基底 */}
        <div className="absolute inset-0 bg-[linear-gradient(158deg,#f6f2e9_0%,#efe9dd_52%,#e8e2d5_100%)]" />
        {/* 暖雾：玫瑰（右上）+ 赭（左中）+ 縹（左下） */}
        <div className="absolute -right-28 -top-32 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(197,100,115,0.20),transparent_68%)]" />
        <div className="absolute -left-28 top-1/3 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(168,122,61,0.14),transparent_70%)]" />
        <div className="absolute -bottom-36 left-1/4 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(61,104,150,0.13),transparent_72%)]" />
        <div className="animate-breathe absolute right-1/4 top-[22%] h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(94,159,126,0.10),transparent_72%)]" />
        {/* 稿纸网格 + 边缘暗角 */}
        <div className="absolute inset-0 grid-veil opacity-45" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_95%_at_50%_42%,transparent_52%,rgba(96,88,76,0.13)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.45),transparent)]" />
        {/* 与深色面板的接缝：内侧暖影 + 一道细金线，避免生硬切边 */}
        <div className="absolute inset-y-0 left-0 hidden w-24 bg-[linear-gradient(90deg,rgba(58,42,45,0.16),rgba(58,42,45,0.04)_45%,transparent)] lg:block" />
        <div className="absolute inset-y-0 left-0 hidden w-px bg-[linear-gradient(180deg,transparent,rgba(168,122,61,0.5)_28%,rgba(168,122,61,0.3)_72%,transparent)] lg:block" />
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* ① 墨色底：玫瑰 → 赭 → 紫 → 縹蓝 */}
      <div className="absolute inset-0 bg-[linear-gradient(138deg,#241a24_0%,#38202f_22%,#472a3a_40%,#332547_60%,#233346_80%,#1f2d3a_100%)]" />
      {/* ② 极光光晕：与总览 Hero 同一套颜色语言 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_62%_58%_at_16%_10%,rgba(206,96,118,0.60)_0%,transparent_70%),radial-gradient(ellipse_52%_46%_at_84%_34%,rgba(176,124,58,0.30)_0%,transparent_72%),radial-gradient(ellipse_58%_52%_at_58%_62%,rgba(124,58,237,0.32)_0%,transparent_74%),radial-gradient(ellipse_64%_48%_at_36%_96%,rgba(61,104,150,0.50)_0%,transparent_72%)]" />
      {/* ③ 漂移的墨晕，让深色面保持「呼吸」 */}
      <div className="animate-drift absolute inset-0 opacity-80">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_46%_38%_at_72%_18%,rgba(245,221,224,0.16)_0%,transparent_100%),radial-gradient(ellipse_42%_34%_at_24%_74%,rgba(221,231,240,0.14)_0%,transparent_100%)]" />
      </div>
      {/* ④ 深色纸面纹理：白色极细网格 */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[length:32px_32px]" />
      {/* ⑤ 边缘暗角 */}
      <div className="absolute inset-0 bg-[radial-gradient(130%_105%_at_38%_38%,transparent_46%,rgba(14,10,16,0.55)_100%)]" />
      {/* ⑥ 顶部一道极细高光 */}
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)]" />
    </div>
  );
}

/** 表单侧的同心圆轨道：玻璃卡背后的一层「几何光环」 */
export function AuthRings() {
  return (
    <svg
      className="animate-drift pointer-events-none absolute right-[4%] top-1/2 hidden h-[36rem] w-[36rem] -translate-y-1/2 text-[#8c5a63]/[0.20] lg:block"
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="100" cy="100" r="96" stroke="currentColor" strokeWidth="0.4" />
      <circle cx="100" cy="100" r="78" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 6" />
      <circle cx="100" cy="100" r="58" stroke="currentColor" strokeWidth="0.4" />
      <circle cx="100" cy="100" r="36" stroke="currentColor" strokeWidth="0.4" strokeDasharray="1 5" />
      <line x1="0" y1="100" x2="200" y2="100" stroke="currentColor" strokeWidth="0.25" />
      <line x1="100" y1="0" x2="100" y2="200" stroke="currentColor" strokeWidth="0.25" />
    </svg>
  );
}