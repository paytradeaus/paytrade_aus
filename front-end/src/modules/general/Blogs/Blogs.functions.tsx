import { SUCCESS } from "@/app/message";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

export async function fetchCategoryList(inputData: Object) {
  try {
    const response = await apolloClient.query({
      query: gql`
        query ListAllPublishedBlogResourcesCategoryWise($contentType: String!) {
          listAllPublishedBlogResourcesCategoryWise(
            content_type: $contentType
          ) {
            message
            status
            data {
              blogResources {
                category
                blogResources {
                  author {
                    email_id
                    first_name
                    id
                    last_name
                  }
                  banner {
                    attachment_type
                    file_name
                    file_path
                    file_type
                    id
                  }
                  blog_status
                  category {
                    id
                    value
                  }
                  comments_count
                  content_type
                  created_on
                  id
                  published_on
                  title
                  urlSlug
                }
              }
            }
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.listAllPublishedBlogResourcesCategoryWise?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.listAllPublishedBlogResourcesCategoryWise?.data;
    } else {
      return [];
    }
  } catch (error: any) {
    // Handle errors
    console.log("ListAllPublishedBlogResourcesCategoryWise ~ error:", error);
  }
}

export async function listAllCategory(inputData: Object) {
  try {
    const response = await apolloClient.query({
      query: gql`
        query ListAllPublishedBlogResources(
          $listBlogResourceInput: ListBlogResourceInput!
        ) {
          listAllPublishedBlogResources(
            listBlogResourceInput: $listBlogResourceInput
          ) {
            status
            message
            data {
              totalCount
              blogResources {
                category {
                  value
                }
              }
            }
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.listAllPublishedBlogResources?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.listAllPublishedBlogResources?.data?.blogResources
        ?.length
        ? [
            ...Array.from(
              new Set(
                response?.data?.listAllPublishedBlogResources?.data?.blogResources.map(
                  (val: any) => val.category.value
                )
              )
            ),
          ]
        : [];
    } else {
      return [];
    }
  } catch (error: any) {
    // Handle errors
    console.log("listAllPublishedBlogResources ~ error:", error);
  }
}

export async function listAllPublishedBlogResources(inputData: Object) {
  try {
    const response = await apolloClient.query({
      query: gql`
        query ListAllPublishedBlogResources(
          $listBlogResourceInput: ListBlogResourceInput!
        ) {
          listAllPublishedBlogResources(
            listBlogResourceInput: $listBlogResourceInput
          ) {
            status
            message
            data {
              totalCount
              blogResources {
                urlSlug
                title
                tags
                published_on
                id
                enable_comments
                created_on
                content_type
                category {
                  value
                }
                banner {
                  file_path
                }
              }
            }
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.listAllPublishedBlogResources?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.listAllPublishedBlogResources?.data;
    } else {
      return [];
    }
  } catch (error: any) {
    // Handle errors
    console.log("listAllPublishedBlogResources ~ error:", error);
  }
}
export async function setMetadata(inputData: Object) {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetBlogResourceByIdSlug($slugOrId: String!) {
          getBlogResourceByIdSlug(slug_or_id: $slugOrId) {
            status
            message
            data {
              suggestions {
                attachment {
                  attachment_type
                  file_name
                  file_path
                  file_type
                  id
                }
                author {
                  email_id
                  first_name
                  id
                  last_name
                }
                banner {
                  attachment_type
                  file_name
                  file_path
                  file_type
                  id
                }
                blog_status
                category {
                  id
                  value
                }
                comment {
                  comment
                  comment_by
                  comment_owner_image_base64
                  comment_owner_name
                  comment_status
                  id
                  posted_on
                }
                comments_count
                content
                content_type
                created_on
                id
                pending_comments_count
                published_on
                tags
                title
                urlSlug
              }
              blogResource {
                attachment {
                  attachment_type
                  file_name
                  file_path
                  file_type
                  id
                }
                author {
                  email_id
                  first_name
                  id
                  last_name
                }
                banner {
                  attachment_type
                  file_name
                  file_path
                  file_type
                  id
                }
                blog_status
                category {
                  id
                  value
                }
                comment {
                  comment
                  comment_by
                  comment_owner_image_base64
                  comment_owner_name
                  comment_status
                  id
                  posted_on
                }
                comments_count
                content
                content_type
                created_on
                id
                pending_comments_count
                published_on
                tags
                title
                urlSlug
                enable_comments
                video_link
              }
            }
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.getBlogResourceByIdSlug?.status === SUCCESS) {
      return response?.data?.getBlogResourceByIdSlug?.data;
    } else {
      return {};
    }
  } catch (error: any) {
    // Handle errors
    console.log(error);
  }
}

export async function fetchIndividualCategory(inputData: Object) {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetBlogResourceByIdSlug($slugOrId: String!) {
          getBlogResourceByIdSlug(slug_or_id: $slugOrId) {
            status
            message
            data {
              suggestions {
                attachment {
                  attachment_type
                  file_name
                  file_path
                  file_type
                  id
                }
                author {
                  email_id
                  first_name
                  id
                  last_name
                }
                banner {
                  attachment_type
                  file_name
                  file_path
                  file_type
                  id
                }
                blog_status
                category {
                  id
                  value
                }
                comment {
                  comment
                  comment_by
                  comment_owner_image_base64
                  comment_owner_name
                  comment_status
                  id
                  posted_on
                }
                comments_count
                content
                content_type
                created_on
                id
                pending_comments_count
                published_on
                tags
                title
                urlSlug
              }
              blogResource {
                attachment {
                  attachment_type
                  file_name
                  file_path
                  file_type
                  id
                }
                author {
                  email_id
                  first_name
                  id
                  last_name
                }
                banner {
                  attachment_type
                  file_name
                  file_path
                  file_type
                  id
                }
                blog_status
                category {
                  id
                  value
                }
                comment {
                  comment
                  comment_by
                  comment_owner_image_base64
                  comment_owner_name
                  comment_status
                  id
                  posted_on
                }
                comments_count
                content
                content_type
                created_on
                id
                pending_comments_count
                published_on
                tags
                title
                urlSlug
                enable_comments
                video_link
              }
            }
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.getBlogResourceByIdSlug?.status === SUCCESS) {
      return response?.data?.getBlogResourceByIdSlug?.data;
    } else {
      return false;
    }
  } catch (error: any) {
    console.log("fetchIndividualCategory ~ error:", error);
    // Handle errors
  }
}
export async function postComment(inputData: any) {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation AddBlogComment($addBlogCommentInput: AddBlogCommentInput!) {
          addBlogComment(addBlogCommentInput: $addBlogCommentInput) {
            message
            status
            data {
              blog {
                title
                id
                blog_status
              }
              comment
              comment_by
              comment_owner_name
              comment_status
              created_on
              id
              posted_on
            }
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.addBlogComment?.status === SUCCESS) {
      showSuccessToast(
        "Your comment has been submitted successfully and will be available once it is approved."
      );
      return true;
    } else {
      showErrorToast(response?.data?.addBlogComment?.message);
    }
  } catch (error: any) {
    showErrorToast("");
    return false;
  }
}
