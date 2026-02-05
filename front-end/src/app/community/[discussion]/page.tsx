import Home from "@/app/page";
import { getList } from "@/modules/general/Community/community.functions";
import { slugifyString } from "@/utils";
import { Metadata } from "next";
type Props = {
  params: { discussion: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title:
      "Community - " +
      (params?.discussion == "product-ideas"
        ? "Product ideas"
        : "Discussions") +
      " | Paytrade",
    description:
      params?.discussion == "product-ideas"
        ? "Discover the most popular product ideas from the community."
        : "Find out what other PayTrade users are talking about",
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical:
        process.env.NEXT_PUBLIC_DEPLOYED_URL +
        (params?.discussion == "product-ideas"
          ? "community/product-ideas"
          : "community/discussions"),
    },
    openGraph: {
      type: "website",
      title: "Bookkeepers | Paytrade",
      description:
        params?.discussion == "product-ideas"
          ? "Discover the most popular product ideas from the community."
          : "Find out what other PayTrade users are talking about",
      url:
        process.env.NEXT_PUBLIC_DEPLOYED_URL +
        (params?.discussion == "product-ideas"
          ? "community/product-ideas"
          : "community/discussions"),
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
  const response = await getList({
    listDiscussionIdeasInput: {
      keyword: "",
      page: 1,
      perPage: 10,
      category: null,
      cmtyContentType:
        params?.discussion == "product-ideas" ? "Idea" : "Discussion",
      sort_mode: null,
    },
  });

  const jsonld = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "PayTrade Community - Discussion Ideas",
    url:
      process.env.NEXT_PUBLIC_DEPLOYED_URL +
      (params?.discussion == "product-ideas"
        ? "community/product-ideas"
        : "community/discussions"),
    mainEntity: response.discussionIdeas.map((item: any) => ({
      "@type": "DiscussionForumPosting",
      "@id":
        process.env.NEXT_PUBLIC_DEPLOYED_URL +
        `${
          params?.discussion == "product-ideas"
            ? "/community/product-ideas"
            : "/community/discussions"
        }/${slugifyString(item?.category?.value || "All")}/${slugifyString(
          item?.title
        )}/${item?.id}`,
      headline: item.title,
      text: item.content,
      articleBody: item.content,
      dateCreated: item.created_on,
      url:
        process.env.NEXT_PUBLIC_DEPLOYED_URL +
        `${
          params?.discussion == "product-ideas"
            ? "/community/product-ideas"
            : "/community/discussions"
        }/${slugifyString(item?.category?.value || "All")}/${slugifyString(
          item?.title
        )}/${item?.id}`,
      discussionUrl:
        process.env.NEXT_PUBLIC_DEPLOYED_URL +
        `${
          params?.discussion == "product-ideas"
            ? "/community/product-ideas"
            : "/community/discussions"
        }/${slugifyString(item?.category?.value || "All")}/${slugifyString(
          item?.title
        )}/${item?.id}`,
      interactionStatistic: [
        {
          "@type": "InteractionCounter",
          interactionType: "https://schema.org/ViewAction",
          userInteractionCount: item.view_count,
        },
        {
          "@type": "InteractionCounter",
          interactionType: "https://schema.org/CommentAction",
          userInteractionCount: item.answer_comment_count,
        },
        {
          "@type": "InteractionCounter",
          interactionType: "https://schema.org/LikeAction",
          userInteractionCount: item.like_count,
        },
      ],
      about: {
        "@type": "Thing",
        name: item.category?.value || "General",
      },
      author: {
        "@type": "Person",
        name: "Anonymous",
      },
    })),
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonld),
        }}
      />
      <Home screen={"DISCUSSION"} />
    </>
  );
}
