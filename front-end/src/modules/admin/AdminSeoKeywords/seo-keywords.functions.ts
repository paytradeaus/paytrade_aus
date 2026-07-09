"use client";
import apolloClient from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

export async function adminListSeoKeywords(inputData: any) {
  try {
    const response = await apolloClient.query({
      query: gql`
        query AdminListSeoKeywords(
          $listSeoKeywordsInput: ListSeoKeywordsInput!
        ) {
          adminListSeoKeywords(listSeoKeywordsInput: $listSeoKeywordsInput) {
            status
            message
            seoKeywords {
              id
              keyword
              slug
              page_title
              meta_description
              page_content
              redirect_url
              tags
              status
              created_on
              updated_on
            }
            totalCount
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.adminListSeoKeywords?.status === ApiResponse.SUCCESS
    ) {
      return response.data.adminListSeoKeywords;
    }
    return { seoKeywords: [], totalCount: 0 };
  } catch (error: any) {
    console.log("adminListSeoKeywords ~ error:", error);
    return { seoKeywords: [], totalCount: 0 };
  }
}

export async function adminGetSeoKeyword(id: string) {
  try {
    const response = await apolloClient.query({
      query: gql`
        query AdminGetSeoKeyword($id: String!) {
          adminGetSeoKeyword(id: $id) {
            status
            message
            data {
              id
              keyword
              slug
              page_title
              meta_description
              page_content
              hero_image_url
              redirect_url
              tags
              status
            }
          }
        }
      `,
      variables: { id },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.adminGetSeoKeyword?.status === ApiResponse.SUCCESS) {
      return response.data.adminGetSeoKeyword.data;
    }
    return null;
  } catch (error: any) {
    console.log("adminGetSeoKeyword ~ error:", error);
    return null;
  }
}

export async function adminAddSeoKeyword(inputData: any) {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation AdminAddSeoKeyword(
          $addSeoKeywordInput: AddSeoKeywordInput!
        ) {
          adminAddSeoKeyword(addSeoKeywordInput: $addSeoKeywordInput) {
            status
            message
            data {
              id
              keyword
              slug
            }
          }
        }
      `,
      variables: inputData,
    });

    return response?.data?.adminAddSeoKeyword;
  } catch (error: any) {
    console.log("adminAddSeoKeyword ~ error:", error);
    return { status: "ERROR", message: error.message };
  }
}

export async function adminUpdateSeoKeyword(inputData: any) {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation AdminUpdateSeoKeyword(
          $updateSeoKeywordInput: UpdateSeoKeywordInput!
        ) {
          adminUpdateSeoKeyword(
            updateSeoKeywordInput: $updateSeoKeywordInput
          ) {
            status
            message
            data {
              id
              keyword
              slug
            }
          }
        }
      `,
      variables: inputData,
    });

    return response?.data?.adminUpdateSeoKeyword;
  } catch (error: any) {
    console.log("adminUpdateSeoKeyword ~ error:", error);
    return { status: "ERROR", message: error.message };
  }
}

export async function adminGenerateSeoKeywordDraft(input: {
  id?: string;
  save?: boolean;
  keyword?: string;
  page_title?: string;
  meta_description?: string;
  tags?: string[];
}) {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation AdminGenerateSeoKeywordDraft(
          $id: String
          $save: Boolean
          $keyword: String
          $page_title: String
          $meta_description: String
          $tags: [String!]
        ) {
          adminGenerateSeoKeywordDraft(
            id: $id
            save: $save
            keyword: $keyword
            page_title: $page_title
            meta_description: $meta_description
            tags: $tags
          ) {
            status
            message
            draft
          }
        }
      `,
      variables: input,
    });

    return response?.data?.adminGenerateSeoKeywordDraft;
  } catch (error: any) {
    console.log("adminGenerateSeoKeywordDraft ~ error:", error);
    return { status: "ERROR", message: error.message };
  }
}

export async function adminGenerateAllSeoKeywordDrafts() {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation AdminGenerateAllSeoKeywordDrafts {
          adminGenerateAllSeoKeywordDrafts {
            status
            message
            total
            succeeded
            failed
            results {
              id
              keyword
              status
              message
            }
          }
        }
      `,
    });

    return response?.data?.adminGenerateAllSeoKeywordDrafts;
  } catch (error: any) {
    console.log("adminGenerateAllSeoKeywordDrafts ~ error:", error);
    return { status: "ERROR", message: error.message };
  }
}

export async function adminDeleteSeoKeyword(id: string) {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation AdminDeleteSeoKeyword($id: String!) {
          adminDeleteSeoKeyword(id: $id) {
            status
            message
          }
        }
      `,
      variables: { id },
    });

    return response?.data?.adminDeleteSeoKeyword;
  } catch (error: any) {
    console.log("adminDeleteSeoKeyword ~ error:", error);
    return { status: "ERROR", message: error.message };
  }
}
