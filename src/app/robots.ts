import type { MetadataRoute } from "next";

const SITE_URL = "https://pigs0516.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/guides/raid-schedule", "/privacy", "/contact"],
        disallow: [
          "/admin",
          "/auth",
          "/calendar",
          "/groups",
          "/invite",
          "/members",
          "/notifications",
          "/schedules",
          "/settings",
          "/templates",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
