import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: false,
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  headers: async () => [
    {
      // Hashed static assets (JS, CSS, fonts, media) — long-lived cache
      source: "/_next/static/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000" },
      ],
    },
    {
      // Optimized images — 1 day browser, 7 day edge
      source: "/_next/image/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=86400, s-maxage=604800" },
      ],
    },
    {
      // HTML pages — 5 min TTL
      source: "/:path*",
      has: [{ type: "header", key: "accept", value: "(.*)text/html(.*)" }],
      headers: [
        { key: "Cache-Control", value: "public, max-age=300, s-maxage=300" },
      ],
    },
    {
      // RSC payloads — 5 min TTL
      source: "/:path*.rsc",
      headers: [
        { key: "Cache-Control", value: "public, max-age=300, s-maxage=300" },
      ],
    },
    {
      // Next.js meta files — 5 min TTL
      source: "/:path*.meta",
      headers: [
        { key: "Cache-Control", value: "public, max-age=300, s-maxage=300" },
      ],
    },
  ],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Allow images from the Strapi CMS (local dev)
      {
        protocol: "http",
        hostname: "localhost",
        port: "1337",
        pathname: "/uploads/**",
      },
      // Allow images from the Strapi CMS (Azure production) — set STRAPI_HOSTNAME env var
      ...(process.env.STRAPI_HOSTNAME
        ? [
            {
              protocol: "https" as const,
              hostname: process.env.STRAPI_HOSTNAME,
              pathname: "/uploads/**",
            },
          ]
        : []),
      // Allow images from Azure Blob Storage (Strapi uploads provider)
      ...(process.env.STRAPI_BLOB_HOSTNAME
        ? [
            {
              protocol: "https" as const,
              hostname: process.env.STRAPI_BLOB_HOSTNAME,
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
