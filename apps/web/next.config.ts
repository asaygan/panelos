import type { NextConfig } from "next";

const API_HOST = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const config: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: API_HOST.startsWith("https") ? "https" : "http",
        hostname: new URL(API_HOST).hostname,
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${API_HOST}/api/v1/:path*`,
      },
    ];
  },
};

export default config;
