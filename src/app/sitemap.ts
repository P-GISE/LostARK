import type { MetadataRoute } from "next";

const SITE_URL = "https://pigs0516.com";
const PUBLIC_PATHS = [
  "/",
  "/about",
  "/guides/raid-schedule",
  "/privacy",
  "/contact",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
  }));
}
