import { type MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const rawBaseUrl = process.env.DEPLOYED_URL || process.env.NEXT_PUBLIC_DEPLOYED_URL || 'https://paytrade.app/';
  const baseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl : `${rawBaseUrl}/`;
  
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: `${baseUrl}sitemap.xml`,
  };
}
