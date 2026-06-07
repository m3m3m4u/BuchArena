import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: "50mb",
    webpackBuildWorker: false,
    webpackMemoryOptimizations: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.your-storagebox.de",
      },
    ],
  },
};

export default nextConfig;
