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
  // Tracing finds onnxruntime's .node binding but not the libonnxruntime dylib
  // it dlopens at runtime, so Catch up would fail only once packaged. Pull the
  // darwin binaries in explicitly; the win32/linux ones stay excluded, which is
  // what keeps this ~35 MB instead of ~210 MB.
  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/onnxruntime-node/bin/napi-v6/darwin/**"],
  },
  // The Mac app bundles the server as a standalone build; normal dev/deploy
  // paths are unaffected.
  ...(process.env.SIDENOTE_STANDALONE === "1" ? { output: "standalone" as const } : {}),
};

export default nextConfig;
