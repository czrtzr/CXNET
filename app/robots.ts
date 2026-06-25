import type { MetadataRoute } from "next";

// CXNET is invite-only and private. Keep the whole surface out of search
// indexes; link previews still render because unfurlers fetch the page directly.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
