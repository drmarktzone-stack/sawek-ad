import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
    proxyClientMaxBodySize: "8mb",
  },
};

export default nextConfig;
