import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // exceljs 体积较大且依赖 Node 内置模块，交给 Node require，避免打包问题
  serverExternalPackages: ["exceljs"],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
