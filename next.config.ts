import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Docker production image (Zeabur).
  output: "standalone",
  serverExternalPackages: ["qrcode", "pg", "pg-native"],
};

export default nextConfig;
