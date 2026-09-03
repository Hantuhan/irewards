import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Docker production image; OpenNext builds ignore this and use its own bundling.
  output: "standalone",
  serverExternalPackages: ["qrcode", "pg", "pg-native"],
};

export default nextConfig;

// Opt-in only: spawning workerd breaks Docker `next dev` (no linux workerd binary on bind-mount).
// Local host: CF_DEV_BINDINGS=1 npm run dev
if (process.env.CF_DEV_BINDINGS === "1") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { initOpenNextCloudflareForDev } = require("@opennextjs/cloudflare") as {
    initOpenNextCloudflareForDev: () => void;
  };
  initOpenNextCloudflareForDev();
}
