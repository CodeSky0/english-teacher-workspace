import { Fragment } from "react";
import { CountUp } from "@/components/common/count-up";
import { cn } from "@/lib/utils";

export type StatBarItem = {
  /** 中文说明（数字下方） */
  label: string;
  /** 英文小标（数字上方），不传则用 label */
  hint?: string;
  value: number;
  suffix?: string;
  decimals?: number;
};

/**
 * 页面概览条 StatBar
 *
 * Washi Aurora v5 的「视觉锚点」：一条窄横条里放 2–4 个大号数字
 * （num-display 26px、实色 text-text、进入视口滚动）+ 右侧主操作按钮。
 * 相比四宫格指标卡更紧凑，让列表 / 表格能更快进入首屏。
 */
export function StatBar({
  items,
  action,
  note,
  className,
}: {
  items: StatBarItem[];
  action?: React.ReactNode;
  note?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 overflow-hidden rounded-2xl px-5 py-3.5",
        "border border-line/70 bg-panel bg-[linear-gradient(160deg,#fffefc_0%,#fefdfa_52%,#faf7f0_100%)]",
        "shadow-paper-sm inner-lit edge-lit",
        className
      )}
    >
      <div className="relative z-[1] flex flex-wrap items-center gap-x-6 gap-y-3">
        {items.map((it, i) => (
          <Fragment key={it.label}>
            {i > 0 && <span aria-hidden className="hidden h-9 w-px shrink-0 bg-line/70 sm:block" />}
            <div className="min-w-[4.25rem]">
              <p className="eyebrow leading-none">{it.hint ?? it.label}</p>
              <p className="mt-1.5 flex items-baseline">
                <span className="num-display text-[26px] font-semibold leading-none tracking-tight text-text">
                  <CountUp value={it.value} decimals={it.decimals} />
                </span>
                {it.suffix && (
                  <span
                    className={
                      it.suffix === "%"
                        ? "text-[13px] font-medium leading-none text-neutral-6"
                        : "ml-[3px] text-[11px] font-medium leading-none text-neutral-6"
                    }
                  >
                    {it.suffix}
                  </span>
                )}
              </p>
              <p className="mt-1 text-[11px] leading-none text-neutral-6">{it.label}</p>
            </div>
          </Fragment>
        ))}
      </div>
      {(action || note) && (
        <div className="relative z-[1] ml-auto flex items-center gap-3">
          {note}
          {action}
        </div>
      )}
    </div>
  );
}
