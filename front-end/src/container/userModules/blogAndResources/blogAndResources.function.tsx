//graphql - apollo client setup
import { gql } from "@apollo/client";
import { client } from "@/app/api/adminAPIs/adminAPIs";
//import from external libraries
import { toast } from "@/app/Toaster";
//module level constants and interfaces
import { SOMETHING_WENT_WRONG, SUCCESS } from "@/common/constants/messages";

export async function fetchBlogsAndResources(inputData: Object) {
  try {
    const response = await client.query({
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
              blogResources {
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
              totalCount
            }
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.listAllPublishedBlogResources?.status === SUCCESS) {
      return response?.data?.listAllPublishedBlogResources?.data;
    } else {
      return [];
    }
  } catch (error: any) {
    console.log("fetchBlogsAndResources ~ error:", error);
    // Handle errors
  }
}

export async function fetchIndividualCategory(inputData: Object) {
  try {
    const response = await client.query({
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
    const response = await client.mutate({
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
      toast.success(
        "Your comment has been submitted successfully and will be available once it is approved."
      );
      return true;
    } else {
      toast.error(response?.data?.addBlogComment?.message);
    }
  } catch (error: any) {
    toast.error("");
    return false;
  }
}

export async function setMetadata(inputData: Object) {
  try {
    const response = await client.query({
      query: gql`
        query GetBlogResourceByIdSlug($slugOrId: String!) {
          getBlogResourceByIdSlug(slug_or_id: $slugOrId) {
            status
            message
            data {
              blogResource {
                banner {
                  file_type
                  file_path
                  file_name
                }
                category {
                  value
                }
                content
                content_type
                title
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
    console.log("🚀 ~ fetchIndividualCategory ~ error:", error);
  }
}

export async function fetchCategoryList(inputData: Object) {
  try {
    const response = await client.query({
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
      SUCCESS
    ) {
      return response?.data?.listAllPublishedBlogResourcesCategoryWise?.data;
    } else {
      return [];
    }
  } catch (error: any) {
    // Handle errors
    console.log("fetchCategoryList ~ error:", error);
  }
}
