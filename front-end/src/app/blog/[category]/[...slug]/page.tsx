"use client";
import { Metadata } from "next";
import Home from "../../../page";
import { setMetadata } from "@/modules/general/Blogs/Blogs.functions";
import { slugifyString } from "@/utils";
export async function generateMetadata({ params }: any): Promise<Metadata> {
  const postData: any = {
    slugOrId: params?.slug[1],
  };
  const response = await setMetadata(postData);
  return {
    title:
      response?.blogResource?.category?.value +
      " - " +
      response?.blogResource?.title +
      " - Blogs | Paytrade",
    description: response?.blogResource?.title,
    icons: {
      icon: "/favicon.png",
    },
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical:
        process.env.NEXT_PUBLIC_DEPLOYED_URL +
        "blog/" +
        slugifyString(response?.blogResource?.category?.value) +
        "/" +
        slugifyString(response?.blogResource?.title) +
        "/" +
        response?.blogResource?.id,
    },
    openGraph: {
      type: "article",
      publishedTime: response?.blogResource?.published_on,
      authors: "Paytrade",
      tags: response?.blogResource?.tags,
      section: response?.blogResource?.category?.value,
      title:
        response?.blogResource?.category?.value +
        " - " +
        response?.blogResource?.title +
        " - Blogs | Paytrade",
      description: response?.blogResource?.title,
      siteName: "Paytrade",
      url:
        process.env.NEXT_PUBLIC_DEPLOYED_URL +
        "blog/" +
        slugifyString(response?.blogResource?.category?.value) +
        "/" +
        slugifyString(response?.blogResource?.title) +
        "/" +
        response?.blogResource?.id,
      images: [
        {
          url:
            response?.blogResource?.banner?.file_path ||
            process.env.NEXT_PUBLIC_DEPLOYED_URL + "images/blogimage1.png",
        },
      ],
    },
  };
}
export default async function Page({ params }: any) {
  const response = await setMetadata({ slugOrId: params?.slug[1] });
  return (
    <>
      {response && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              headline: response?.blogResource?.title,
              description: response?.blogResource?.content,
              author: "Paytrade Admin",
              datePublished: response?.blogResource?.published_on,
              mainEntityOfPage: {
                "@type": "WebPage",
                "@id":
                  process.env.NEXT_PUBLIC_DEPLOYED_URL +
                  "blog/" +
                  slugifyString(response?.blogResource?.category?.value) +
                  "/" +
                  slugifyString(response?.blogResource?.title) +
                  "/" +
                  response?.blogResource?.id,
              },
              image:
                response?.blogResource?.banner?.file_path ||
                process.env.NEXT_PUBLIC_DEPLOYED_URL + "images/blogimage1.png",
            }),
          }}
        />
      )}
      <Home screen={"BLOG-DETAIL"} />
    </>
  );
}
