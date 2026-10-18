/**
 * 路由级入场动画
 *
 * App Router 的 template 会在每次导航时重新挂载（与 layout 不同），
 * 因此这里是给所有仪表盘页面注入统一「浮现」动效的最佳位置。
 * 时长刻意压得比 --dur-slow 短，避免切换页面时有拖沓感。
 */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-in-up" style={{ animationDuration: "var(--dur-smooth)" }}>
      {children}
    </div>
  );
}
