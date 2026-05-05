import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  // console.log("Menifest function is being call")
  return {
    name: "Autoworx",
    short_name: "Autoworx",
    description: "A Business Web App",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0C1427",
    icons: [
      {
        src: `${baseUrl}/icons/pwa/autoworx-logo-120x120.png`,
        sizes: "120x120",
        type: "image/png",
      },
      {
        src: `${baseUrl}/icons/pwa/autoworx-logo-152x152.png`,
        sizes: "152x152",
        type: "image/png",
      },
      {
        src: ` ${baseUrl}/icons/pwa/autoworx-logo-167x167.png`,
        sizes: "167x167",
        type: "image/png",
      },
      {
        src: ` ${baseUrl}/icons/pwa/autoworx-logo-180x180.png`,
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: `${baseUrl}/icons/pwa/autoworx-logo.png`,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: ` ${baseUrl}/icons/pwa/icon-512x512.png`,
        sizes: "512x512",
        type: "image/png",
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
        src: `${baseUrl}/icons/pwa/icon-152x152.png`,
        sizes: "152x152",
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
      // {
      //   "src":env("NEXT_PUBLIC_SITE_URL") + "/icons/icon-512x512.png",
      //   "sizes": "512x512",
      //   "type": "image/png"
      // }
    ],
  };
}
