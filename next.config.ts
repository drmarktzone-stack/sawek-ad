import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
    proxyClientMaxBodySize: "5mb",
  },
};

export default nextConfig;
