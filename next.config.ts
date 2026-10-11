import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: without this Turbopack walks up and finds an
  // unrelated package-lock.json outside the repository.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
