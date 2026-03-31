import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/profil/", "/nachrichten/", "/lesezeichen/", "/meine-buecher/"],
      },
    ],
    sitemap: "https://bucharena.org/sitemap.xml",
  };
}
