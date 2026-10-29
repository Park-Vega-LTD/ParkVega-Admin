import type { NextConfig } from "next";

// Build-time environment guard: fail fast if the API base URL is missing.
// Every API call goes through server code (src/lib/api-url.ts), which reads
// PARK_VEGA_API_URL, or NEXT_PUBLIC_API_URL for older environments. Without
// it the build cannot produce a working application, so we throw immediately.
if (!process.env.PARK_VEGA_API_URL && !process.env.NEXT_PUBLIC_API_URL) {
  throw new Error(
    "PARK_VEGA_API_URL is not set. Define it in your environment (e.g. .env.local) before building or running the app.",
  );
}

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.parkvega.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
    minimumCacheTTL: 3600,
  },
  async headers() {
    // Internal tool: never framed by other sites, never indexed.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
