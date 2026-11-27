import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Semua halaman butuh login, jadi dirender per-request (model caching klasik).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
