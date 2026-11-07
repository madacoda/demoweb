import type { NextConfig } from "next";
const config: NextConfig = {
  agentRules: false,
  // Production images are built on Linux; Windows keeps normal local builds.
  output: process.platform === "win32" ? undefined : "standalone",
  turbopack: { root: import.meta.dirname },
  outputFileTracingRoot: import.meta.dirname,
};
export default config;
