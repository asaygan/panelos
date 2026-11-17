import type { MetadataRoute } from "next";

/** Installable PWA: technicians add PanelOS to the home screen and scan from there. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PanelOS",
    short_name: "PanelOS",
    description: "Endüstriyel elektrik panoları için işletim sistemi.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#101318",
    theme_color: "#101318",
    lang: "tr",
    categories: ["business", "productivity", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Panolar", url: "/panels" },
      { name: "Arızalar", url: "/issues" },
      { name: "Bakım", url: "/maintenance" },
    ],
  };
}
