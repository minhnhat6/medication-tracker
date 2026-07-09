/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true, // Gzip/Brotli responses
  serverExternalPackages: ["exceljs", "web-push"],
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        // Static API resources — cache 60s, stale-while-revalidate 5 phút
        source: "/api/medicines",
        headers: [
          { key: "Cache-Control", value: "s-maxage=60, stale-while-revalidate=300" },
        ],
      },
      {
        source: "/api/notifications/settings",
        headers: [
          { key: "Cache-Control", value: "s-maxage=60, stale-while-revalidate=300" },
        ],
      },
      {
        // Security headers cho tất cả các route
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;

