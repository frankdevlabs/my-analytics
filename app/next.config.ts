import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Enable Turbopack filesystem caching for improved dev performance
    turbopackFileSystemCacheForDev: true,
  },
};

export default nextConfig;
