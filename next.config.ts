import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "better-sqlite3-multiple-ciphers",
    "better-sqlite3",
  ],
};

export default nextConfig;
