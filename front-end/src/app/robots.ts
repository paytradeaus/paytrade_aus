import { type MetadataRoute } from "next";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function robots(): MetadataRoute.Robots {
  // Hardcoded to ensure correct URL - www subdomain is not supported
  const baseUrl = 'https://paytrade.app/';
  
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
