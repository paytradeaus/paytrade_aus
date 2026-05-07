import apolloClient from "@/network/apolloClient";
import { gql } from "@apollo/client";

export async function searchSupport(query: string, page = 1, perPage = 10) {
  try {
    const response = await apolloClient.query({
      query: gql`
        query SearchSupport($searchSupportInput: SearchSupportInput!) {
          searchSupport(searchSupportInput: $searchSupportInput) {
            status
            results {
              id
              type
              title
              snippet
              url
              category
            }
            totalCount
          }
        }
      `,
      variables: {
        searchSupportInput: { query, page, perPage },
      },
      fetchPolicy: "no-cache",
    });

    return response?.data?.searchSupport || {
      status: "ERROR",
      results: [],
      totalCount: 0,
    };
  } catch (error: any) {
    console.log("searchSupport error:", error);
    return { status: "ERROR", results: [], totalCount: 0 };
  }
}

export async function askAiSupport(question: string) {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation AskAiSupport($askAiSupportInput: AskAiSupportInput!) {
          askAiSupport(askAiSupportInput: $askAiSupportInput) {
            status
            answer
            message
            remainingQuota
            communityPostId
            category
            suggestions
          }
        }
      `,
      variables: {
        askAiSupportInput: { question },
      },
    });

    return response?.data?.askAiSupport || {
      status: "ERROR",
      answer: null,
      message: "Something went wrong.",
      remainingQuota: 0,
      communityPostId: null,
    };
  } catch (error: any) {
    console.log("askAiSupport error:", error);
    return {
      status: "ERROR",
      answer: null,
      message: error?.message || "Something went wrong.",
      remainingQuota: 0,
      communityPostId: null,
    };
  }
}
