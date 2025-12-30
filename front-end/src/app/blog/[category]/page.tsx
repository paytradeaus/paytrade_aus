import { Metadata } from "next";
import Home from "../../page";
import { slugifyString } from "@/utils";
import {
  listAllCategory,
  listAllPublishedBlogResources,
} from "@/modules/general/Blogs/Blogs.functions";
export async function generateMetadata({ params }: any): Promise<Metadata> {
  return {
    title: params?.category + " - Blogs | Paytrade",
    description: params?.category,
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
        slugifyString(params?.category),
    },
    openGraph: {
      type: "website",
      title: params?.category + " - Blogs | Paytrade",
      description: params?.category,
      siteName: "Paytrade",
      locale: "en_US",
      url:
        process.env.NEXT_PUBLIC_DEPLOYED_URL +
        "blog/" +
        slugifyString(params?.category),
    },
  };
}
export default async function Page({ params }: any) {
  const categoryData = await listAllCategory({
    listBlogResourceInput: { contentType: "Blog" },
  });
  const newCategoryList = [
    { label: "Latest articles", slug: "latest-articles" },
    ...(categoryData || []).map((val: any) => ({
      label: val,
      slug: slugifyString(val),
    })),
  ];
  const category = params?.category;
  const selectedCategory =
    newCategoryList.find((val) => val.slug === category)?.label ||
    "Latest articles";
  const postData = {
    contentType: "Blog",
    category: selectedCategory,
    page: 1,
    perPage: 6,
  };
  const data = await listAllPublishedBlogResources({
    listBlogResourceInput: postData,
  });
  const blogPostsJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: selectedCategory + " - Blogs | Paytrade",
    url:
      process.env.NEXT_PUBLIC_DEPLOYED_URL +
      "blog/" +
      slugifyString(params?.category),
    description: params?.category,
    blogPost: data?.blogResources?.map((post: any) => ({
      "@type": "BlogPosting",
      headline: post?.title,
      url:
        process.env.NEXT_PUBLIC_DEPLOYED_URL +
        "blog/" +
        slugifyString(params?.category),
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
      {params && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(blogPostsJsonLd),
          }}
        />
      )}
      <Home screen={"BLOGS"} />
    </>
  );
}
