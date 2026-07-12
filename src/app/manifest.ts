import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "netgreen",
    short_name: "netgreen",
    description: "Jobs, scheduling, costs, margins and profit for netgreen",
    start_url: "/",
    display: "standalone",
    background_color: "#eceee8",
    theme_color: "#0e3f27",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
