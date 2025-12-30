import { Metadata } from "next";
import Home from "../page";
import seoMetadata from "@/utils/seoMetadata";
import { getList } from "@/modules/general/Community/community.functions";

export const metadata: Metadata = seoMetadata.community;

export default async function Page() {
  const [topDiscussions, topIdeas, topUnanswered] = await Promise.all([
    getList({
      listDiscussionIdeasInput: {
        perPage: 3,
        page: 1,
        top_content: true,
        cmtyContentType: "Discussion",
      },
    }),
    getList({
      listDiscussionIdeasInput: {
        perPage: 3,
        page: 1,
        top_content: true,
        cmtyContentType: "Idea",
      },
    }),
    getList({
      listDiscussionIdeasInput: {
        perPage: 3,
        page: 1,
        top_content: true,
        is_answered: false,
        cmtyContentType: "Discussion",
      },
    }),
  ]);
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: metadata.title,
    url: metadata.alternates?.canonical,
    description: metadata.description,
    mainEntity: [
      ...(topDiscussions?.discussionIdeas?.map((item: any) => ({
        "@type": "QAPage",
        name: item?.title,
        dateCreated: item?.created_on,
        suggestedAnswer: item?.content,
      })) || []),
      ...(topUnanswered?.discussionIdeas?.map((item: any) => ({
        "@type": "Question",
        name: item?.title,
        text: item?.content,
        dateCreated: item?.created_on,
        upvoteCount: item?.vote_count || item?.like_count || 0,
        answerCount: item?.answer_comment_count || 0,
      })) || []),
      ...(topIdeas?.discussionIdeas?.map((item: any) => ({
        "@type": "CreativeWork",
        name: item.title,
        description: item.content,
        datePublished: item.created_on,
        author: {
          "@type": "Organization",
          name: "PayTrade Community",
        },
      })) || []),
    ],
    publisher: {
      "@type": "Organization",
      name: "PayTrade",
      url: metadata.alternates?.canonical,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schemaData),
        }}
      />
      <Home screen="COMMUNITY" />
    </>
  );
}
