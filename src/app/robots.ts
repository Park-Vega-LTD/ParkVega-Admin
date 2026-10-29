import type { MetadataRoute } from "next";

/** Internal staff console: nothing here should be crawled. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
