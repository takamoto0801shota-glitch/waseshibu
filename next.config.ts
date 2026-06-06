import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // dev 中の HMR で .next が壊れて moduleId エラーになるのを防ぐ
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
