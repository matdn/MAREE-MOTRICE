import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ignore ESLint lors du build
  },
};

export default nextConfig;
