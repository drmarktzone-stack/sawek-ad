import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

const PATHS = ["/", "/about", "/privacy", "/terms", "/status", "/pricing"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PATHS.map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/about" || path === "/privacy" || path === "/terms" ? 0.8 : 0.5,
  }));
}
