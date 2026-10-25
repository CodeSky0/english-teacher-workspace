import type { Metadata } from "next";
import { Inter, Noto_Serif_SC, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Ambient } from "@/components/common/ambient";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
  adjustFontFallback: true,
});

const notoSerif = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-serif",
  display: "swap",
  fallback: ["Georgia", "Songti SC", "STSong", "SimSun", "serif"],
  adjustFontFallback: true,
});

/**
 * 英文展示衬线（Cormorant Garamond）
 * 用于大号统计数字 / 英文标题 / 拉丁点缀：
 * 高对比度衬线 + 优雅字形，与中文思源宋体同调，强化「英语」主题气质。
 */
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--app-font-display",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "英语教师工作台",
  description: "中小学英语教师备课、教学、教研、学情分析一体化工作台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${inter.variable} ${notoSerif.variable} ${cormorant.variable}`}>
        <Ambient />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
