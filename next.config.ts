import path from "node:path";
import type { NextConfig } from "next";

const projectRoot = process.env.MUWAHID_TURBOPACK_ROOT
  ? path.resolve(process.env.MUWAHID_TURBOPACK_ROOT)
  : path.resolve();

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  output: process.env.MUWAHID_STANDALONE === "1" ? "standalone" : undefined,
  turbopack: {
    root: projectRoot,
  },
  async rewrites() {
    return [
      {
        source: "/beranda.html",
        destination: "/beranda",
      },
    ];
  },
};

export default nextConfig;
