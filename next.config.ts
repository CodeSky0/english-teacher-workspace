import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // exceljs 体积较大且依赖 Node 内置模块，交给 Node require，避免打包问题
  serverExternalPackages: ["exceljs"],

  // 生产环境关闭 X-Powered-By 头，减少信息泄露
  poweredByHeader: false,

  // 启用 React 严格模式，提前暴露潜在问题
  reactStrictMode: true,

  // 生产环境移除 console（保留 error/warn 便于排查）
  compiler: {
    removeConsole: isProd ? { exclude: ["error", "warn"] } : false,
  },

  experimental: {
    // 按需导入大型图标/工具库，显著减小 client bundle
    optimizePackageImports: [
      "lucide-react",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
      "recharts",
    ],
  },

  // React Compiler：自动 memoization，减少手写 useMemo/useCallback/React.memo
  reactCompiler: true,

  images: {
    // 项目暂无图片资源；保留 webp/avif 默认格式，收窄 remotePatterns 避免 SSRF
    formats: ["image/avif", "image/webp"],
    remotePatterns: [],
  },
};

export default nextConfig;
