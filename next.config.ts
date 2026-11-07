import type { NextConfig } from "next";
const config: NextConfig = {
  agentRules: false,
  turbopack: { root: import.meta.dirname },
  outputFileTracingRoot: import.meta.dirname,
};
export default config;
