"use client";
import Home from "@/app/page";
import { getList } from "@/modules/admin/AdminCommunity/community.functions";
import { categoryListAndCount } from "@/modules/general/Community/community.functions";
import { slugifyString } from "@/utils";
import { Metadata } from "next";
type Props = {
  params: { discussion: string; category: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title:
      "Community - " +
      (params?.discussion == "product-ideas"
        ? "Product ideas"
        : "Discussions") +
      " - " +
      (params?.category || "All") +
      " | Paytrade",
    description: params?.category || "All",
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
        (params?.category || "All"),
    },
    openGraph: {
      type: "website",
      title:
        "Community - " +
        (params?.discussion == "product-ideas"
          ? "Product ideas"
          : "Discussions") +
        " - " +
        (params?.category || "All") +
        " | Paytrade",
      description: params?.category || "All",
      url:
        process.env.NEXT_PUBLIC_DEPLOYED_URL +
        (params?.discussion == "product-ideas"
          ? "community/product-ideas"
          : "community/discussions") +
        "/" +
        (params?.category || "All"),
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
  const category = await categoryListAndCount({
    contentType: params?.discussion == "product-ideas" ? "Idea" : "Discussion",
  });
  const modData = category.categories.map((val: any) => {
    return {
      value: val.master_value,
      id: val.master_id,
      count: val.per_category_count,
      slug: slugifyString(val.master_value),
    };
  });
  const categoryNotSlug = modData.find(
    (val: any) => val.slug == params?.category
  );
  const response = await getList({
    listDiscussionIdeasInput: {
      keyword: "",
      page: 1,
      perPage: 10,
      category: categoryNotSlug?.value || null,
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
            ? "community/product-ideas"
            : "community/discussions"
        }/${slugifyString(item?.category?.value || "All")}/${slugifyString(
          item?.title
        )}/${item?.id}`,
      headline: item.title,
      articleBody: item.content,
      dateCreated: item.created_on,
      discussionUrl:
        process.env.NEXT_PUBLIC_DEPLOYED_URL +
        `${
          params?.discussion == "product-ideas"
            ? "community/product-ideas"
            : "community/discussions"
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
