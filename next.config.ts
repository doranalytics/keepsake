import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native/optional-binary packages Next must not try to bundle: better-sqlite3
  // and onnxruntime load .node binaries at runtime, and transformers.js resolves
  // its backend dynamically.
  serverExternalPackages: [
    "better-sqlite3",
    "onnxruntime-node",
    "@huggingface/transformers",
  ],
  outputFileTracingRoot: process.cwd(),
  // The Mac app bundles the server as a standalone build; normal dev/deploy
  // paths are unaffected.
  ...(process.env.SIDENOTE_STANDALONE === "1" ? { output: "standalone" as const } : {}),
};

export default nextConfig;
