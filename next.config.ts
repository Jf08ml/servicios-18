import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Genera .next/standalone con solo lo necesario para producción (Docker).
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "60mb", // permite subir videos de galería (máx. 50 MB) + margen

    },
  },
};

export default nextConfig;
