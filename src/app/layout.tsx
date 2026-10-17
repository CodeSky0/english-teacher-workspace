import type { Metadata } from "next";
import { Inter, Noto_Serif_SC } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
  adjustFontFallback: true,
});

const notoSerif = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
  fallback: ["Georgia", "Songti SC", "STSong", "SimSun", "serif"],
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
      <body className={`${inter.variable} ${notoSerif.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
