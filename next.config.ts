import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: ["preview-chat-f843d713-9867-4a7c-8c28-16d46bb543dd.space.z.ai"],
};

export default nextConfig;
