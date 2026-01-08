"use client";
import { Metadata } from "next";
import Home from "../page";
import seoMetadata from "@/utils/seoMetadata";
import { listAllPublishedBlogResources } from "@/modules/general/Blogs/Blogs.functions";
import { slugifyString } from "@/utils";

export const metadata: Metadata = seoMetadata.resources;

export default async function Page() {
  const postData = {
    contentType: "Resource",
    category: "",
    page: 1,
    perPage: 6,
  };

  const data = await listAllPublishedBlogResources({
    listBlogResourceInput: postData,
  });
  const blogPostsJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: metadata.title,
    url: metadata.alternates?.canonical,
    description: metadata.description,
    blogPost: data?.blogResources?.map((post: any) => ({
      "@type": "BlogPosting",
      headline: post?.title,
      url:
        process.env.NEXT_PUBLIC_DEPLOYED_URL +
        `articles/` +
        slugifyString(post?.category?.value) +
        "/" +
        slugifyString(post?.title) +
        "/" +
        post?.id,
      description: post?.title,
      datePublished: post?.published_on,
      author: {
        "@type": "Person",
        name: "Paytrade Admin",
      },
      image:
        post?.banner?.file_path ||
        process.env.NEXT_PUBLIC_DEPLOYED_URL + "images/blogimage1.png",
    })),
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(blogPostsJsonLd),
        }}
      />
      <Home screen={"ARTICLES"} />
    </>
  );
}
