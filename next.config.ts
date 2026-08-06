import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingRoot: process.cwd(),
  // The Mac app bundles the server as a standalone build; normal dev/deploy
  // paths are unaffected.
  ...(process.env.SIDENOTE_STANDALONE === "1" ? { output: "standalone" as const } : {}),
};

export default nextConfig;
