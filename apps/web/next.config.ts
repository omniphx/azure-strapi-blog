import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  images: {
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
