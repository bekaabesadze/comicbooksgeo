import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source:
          "/:path((?!api|_next/static|_next/image|favicon.ico|icon.jpg|robots.txt|sitemap.xml|.*\\.[^/]+$).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
