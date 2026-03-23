import apolloClient from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

export async function getSeoKeywordBySlug(slug: string) {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetSeoKeywordBySlug($slug: String!) {
          getSeoKeywordBySlug(slug: $slug) {
            status
            message
            data {
              id
              keyword
              slug
              page_title
              meta_description
              page_content
              tags
              status
              created_on
              updated_on
            }
          }
        }
      `,
      variables: { slug },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.getSeoKeywordBySlug?.status === ApiResponse.SUCCESS) {
      return response.data.getSeoKeywordBySlug.data;
    }
    return null;
  } catch (error: any) {
    console.log("getSeoKeywordBySlug ~ error:", error);
    return null;
  }
}

export async function getActiveSeoKeywords() {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetActiveSeoKeywords {
          getActiveSeoKeywords {
            status
            message
            seoKeywords {
              id
              keyword
              slug
              page_title
              meta_description
              page_content
              tags
              status
              created_on
              updated_on
            }
            totalCount
          }
        }
      `,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.getActiveSeoKeywords?.status === ApiResponse.SUCCESS) {
      return response.data.getActiveSeoKeywords;
    }
    return { seoKeywords: [], totalCount: 0 };
  } catch (error: any) {
    console.log("getActiveSeoKeywords ~ error:", error);
    return { seoKeywords: [], totalCount: 0 };
  }
}
