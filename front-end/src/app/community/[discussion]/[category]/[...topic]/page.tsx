import Home from "@/app/page";
import { getDiscussionIdeaById } from "@/modules/general/Community/community.functions";
import { slugifyString } from "@/utils";
import { Metadata } from "next";
type Props = {
  params: { discussion: string; category: string; topic: string[] };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const response = await getDiscussionIdeaById({
    getDiscussionIdeaId: params?.topic[1],
  });
  console.log(response);
  return {
    title:
      "Community - " +
      (params?.discussion == "product-ideas"
        ? "Product ideas"
        : "Discussions") +
      " - " +
      response?.title +
      " | Paytrade",
    description: response?.content,
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical:
        process.env.NEXT_PUBLIC_DEPLOYED_URL +
        (params?.discussion == "product-ideas"
          ? "community/product-ideas"
          : "community/discussions") +
        "/" +
        (params?.category || "All") +
        "/" +
        slugifyString(response?.title) +
        "/" +
        response?.id,
    },
    openGraph: {
      type: "article",
      title:
        "Community - " +
        (params?.discussion == "product-ideas"
          ? "Product ideas"
          : "Discussions") +
        " - " +
        response?.title +
        " | Paytrade",
      description: response?.content,
      publishedTime: response?.created_on,
      authors: response?.admin_author
        ? response?.admin_author
        : response?.author?.first_name + " " + response?.author?.last_name,
      tags: [response?.category?.value, response?.title],
      section: response?.category?.value,
      url:
        process.env.NEXT_PUBLIC_DEPLOYED_URL +
        (params?.discussion == "product-ideas"
          ? "community/product-ideas"
          : "community/discussions") +
        "/" +
        (params?.category || "All") +
        "/" +
        slugifyString(response?.title) +
        "/" +
        response?.id,
      siteName: "Paytrade",
      images: [
        {
          url: "/favicon.png",
          alt: "Paytrade",
        },
      ],
      locale: "en_US",
    },
  };
}
export default async function Page({ params }: Props) {
  const response = await getDiscussionIdeaById({
    getDiscussionIdeaId: params?.topic[1],
  });
  return (
    <>
      {response && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "DiscussionForumPosting",
              headline: response?.title,
              description: response?.content,
              text: response?.content,
              url:
                process.env.NEXT_PUBLIC_DEPLOYED_URL +
                (params?.discussion == "product-ideas"
                  ? "/community/product-ideas"
                  : "/community/discussions") +
                "/" +
                (params?.category || "All") +
                "/" +
                slugifyString(response?.title) +
                "/" +
                response?.id,
              author: {
                "@type": "Person",
                name: response?.admin_author
                  ? response?.admin_author
                  : response?.author?.first_name +
                    " " +
                    response?.author?.last_name,
              },
              datePublished: response?.created_on,
              mainEntityOfPage: {
                "@type": "WebPage",
                "@id":
                  process.env.NEXT_PUBLIC_DEPLOYED_URL +
                  (params?.discussion == "product-ideas"
                    ? "/community/product-ideas"
                    : "/community/discussions") +
                  "/" +
                  (params?.category || "All") +
                  "/" +
                  slugifyString(response?.title) +
                  "/" +
                  response?.id,
              },
            }),
          }}
        />
      )}
      <Home screen={"TOPIC"} />
    </>
  );
}
