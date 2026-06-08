import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://valentinethebuhgalter.by";

  const staticRoutes = [
    "/",
    "/pricing",
    "/faq",
    "/contacts",
    "/payment",
    "/refund",
    "/privacy",
    "/offer",
  ];

  return staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: route === "/" ? 1 : 0.8,
  }));
}
