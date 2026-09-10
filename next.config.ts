import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverActions: {
    allowedOrigins: ["localhost:3000", "absenkuy.cc", "www.absenkuy.cc"],
  },
};
export default nextConfig;
