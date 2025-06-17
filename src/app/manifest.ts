import type { MetadataRoute } from "next";
import { env } from "next-runtime-env";

export default function manifest(): MetadataRoute.Manifest {
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
        src: env("NEXT_PUBLIC_SITE_URL") + "/icons/autoworx-logo.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  };
}
