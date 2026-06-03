import type { NextConfig } from "next";

// The rewrite target (server-side / build-time): prefer API_INTERNAL_URL, then
// the legacy NEXT_PUBLIC_API_URL for back-compat. The browser never calls the API
// host directly — it uses the relative NEXT_PUBLIC_API_BASE (default /api/v1),
// which this rewrite proxies to the upstream FastAPI app (same-origin → cookies
// flow through without cross-site SameSite issues).
const API_HOST =
  process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Server Action origin allowlist. Next.js 15 rejects Server Action POSTs when
// the request `origin` / `x-forwarded-host` doesn't match the running host
// (anti-CSRF). Amplify Hosting fronts the app with CloudFront and a custom
// domain, so the deployed host (e.g. `panelos.io`, Amplify preview subdomain)
// differs from the build-time origin and must be explicitly allowlisted —
// otherwise Server Actions return 503 / "Network error".
const SERVER_ACTION_ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  // Always include the Amplify default subdomain even when a custom domain
  // is set, so previews + direct testing continue to work.
  "main.d3leqepo0da6vp.amplifyapp.com",
  "panelos.io",
  "www.panelos.io",
]
  .filter((s): s is string => Boolean(s))
  .map((s) => s.replace(/^https?:\/\//, ""));

const config: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
    serverActions: {
      allowedOrigins: SERVER_ACTION_ALLOWED_ORIGINS,
    },
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
