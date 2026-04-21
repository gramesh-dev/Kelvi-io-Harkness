import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

/** Next may pick a parent folder when multiple lockfiles exist; wrong root breaks `/login` and other app routes in dev. */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
