import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fondo Familiar",
    short_name: "Fondo",
    description: "Fondo de Ahorro Familiar: aportes, préstamos y estado de cuenta.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0e0d",
    theme_color: "#0a0e0d",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
