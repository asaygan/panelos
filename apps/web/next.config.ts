import type { NextConfig } from "next";

// The rewrite target (server-side / build-time): prefer API_INTERNAL_URL, then
// the legacy NEXT_PUBLIC_API_URL for back-compat. The browser never calls the API
// host directly — it uses the relative NEXT_PUBLIC_API_BASE (default /api/v1),
// which this rewrite proxies to the upstream FastAPI app (same-origin → cookies
// flow through without cross-site SameSite issues).
const API_HOST =
  process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
