import type { NextConfig } from "next";

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["react", "lucide-react"]
  }
};

export default nextConfig;
