import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["libheif-js"],
  outputFileTracingIncludes: {
    // Sharp's ESM entry can leave its native binary and libvips out of the trace.
    "/api/profile-photo": ["./node_modules/@img/sharp-*/**/*"],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "absenkuy.cc", "www.absenkuy.cc"],
    },
  },
};
export default nextConfig;
