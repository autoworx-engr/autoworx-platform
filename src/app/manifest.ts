import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  return {
    name: "Luminar CRM",
    short_name: "Luminar",
    description: "Luminar CRM — revenue workspace for pipeline, clients, invoicing, and team management.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0f1117",
    theme_color: "#14b8a6",
    icons: [
      {
        src: `${baseUrl}/icons/luminar-crm-logo.svg`,
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: `${baseUrl}/icons/pwa/icon-48x48.png`,
        sizes: "48x48",
        type: "image/png",
      },
      {
        src: `${baseUrl}/icons/pwa/icon-72x72.png`,
        sizes: "72x72",
        type: "image/png",
      },
      {
        src: `${baseUrl}/icons/pwa/icon-96x96.png`,
        sizes: "96x96",
        type: "image/png",
      },
      {
        src: `${baseUrl}/icons/pwa/icon-128x128.png`,
        sizes: "128x128",
        type: "image/png",
      },
      {
        src: `${baseUrl}/icons/pwa/icon-144x144.png`,
        sizes: "144x144",
        type: "image/png",
      },
      {
        src: `${baseUrl}/icons/pwa/icon-192x192.png`,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: `${baseUrl}/icons/pwa/icon-256x256.png`,
        sizes: "256x256",
        type: "image/png",
      },
      {
        src: `${baseUrl}/icons/pwa/icon-384x384.png`,
        sizes: "384x384",
        type: "image/png",
      },
      {
        src: `${baseUrl}/icons/pwa/icon-512x512.png`,
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
