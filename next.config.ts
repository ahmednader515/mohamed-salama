import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /** أحجام أصغر من الافتراضي (حتى 3840px) لتسريع التحويل وتحميل الهيرو */
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.dev",
        pathname: "/**",
      },
    ],
  },
  serverExternalPackages: ["@neondatabase/serverless"],
  turbopack: {
    resolveAlias: {
      "next/auth": "next-auth",
      "next-auth/react": "next-auth/react",
    },
  },
  async headers() {
    return [
      {
        source: "/",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
        ],
      },
      {
        source: "/courses",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
        ],
      },
      {
        source: "/courses/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
        ],
      },
    ];
  },
};

export default nextConfig;
