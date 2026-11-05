import type { NextConfig } from "next";

const basePath = "/phn-helpdesk";

const nextConfig: NextConfig = {
  basePath,
  // Dev-only badge: bottom-left sat on top of the admin sidebar's collapse/expand button.
  devIndicators: { position: "bottom-right" },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
};

export default nextConfig;
