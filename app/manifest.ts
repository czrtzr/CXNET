import type { MetadataRoute } from "next";

// Installable-app metadata. Warm near-black chrome to match the app shell; the
// SVG crest scales for any launcher, with the generated apple-icon as a raster
// fallback.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CXNET",
    short_name: "CXNET",
    description: "A private wealth command center.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0807",
    theme_color: "#0a0807",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
