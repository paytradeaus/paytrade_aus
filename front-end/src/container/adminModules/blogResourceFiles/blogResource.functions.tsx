import { toast } from "@/app/Toaster";
import { client } from "@/app/api/apolloClientServices";
import {
  ERROR,
  SOMETHING_WENT_WRONG,
  SUCCESS,
} from "@/common/constants/messages";
import { gql } from "@apollo/client";
import { BlogComment, BlogResource } from "./blogResource.types";

export const AdminListAllBlogResources = async (
  data: any,
  setLoading?: Function
): Promise<{ admins: BlogResource[]; totalCount: number } | any> => {
  try {
    const response = await client.query({
      query: gql`
        query Query($listBlogResourceInput: ListBlogResourceInput!) {
          adminListAllBlogResources(
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
      variables: {
        listBlogResourceInput: {
          category: data?.category,
          author: data?.author || null,
          contentType: data?.contentType, //"Blog","Resource"
          date_filter: null,
          end_date: null,
          start_date: null,
          page: data?.page,
          perPage: data?.perPage,
          keyword: data?.keyWord,
          status: data?.status,
        },
      },
      fetchPolicy: "no-cache",
    });
    if (
      response &&
      response?.data?.adminListAllBlogResources?.status === SUCCESS
    ) {
      return response?.data?.adminListAllBlogResources?.data;
    }
    if (
      response &&
      response?.data?.adminListAllBlogResources?.status === ERROR
    ) {
      console.error(
        response && response?.data?.adminListAllBlogResources?.message
      );
      return null;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

// for fetching Categorie optins from API
export const AdminfetchAllMasterTypeDetails = async (
  masterType: "Resource Category" | "Blog Category",
  setLoading?: Function
): Promise<{ value: string; label: string } | any> => {
  try {
    const response = await client.query({
      query: gql`
        query AdminfetchAllMasterTypeDetails($masterType: String!) {
          adminfetchAllMasterTypeDetails(MasterType: $masterType) {
            data {
              description
              id
              status
              value
            }
            message
            status
          }
        }
      `,
      variables: {
        masterType: masterType,
      },
    });
    if (response?.data?.adminfetchAllMasterTypeDetails?.data?.length > 0) {
      let data = response.data.adminfetchAllMasterTypeDetails?.data;
      let modifiedData = data.map((each: any) => {
        return { value: each?.id, label: each?.value };
      });
      return modifiedData;
    } else {
      return [];
    }
  } catch (error: any) {
    // Handle errors
    toast.error(error?.message || SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return [];
  } finally {
    setLoading && setLoading(false);
  }
};

export const AdminAddBlogResource = async (
  data: any
  // successMsg: string,
  // setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation AdminAddBlogResource(
          $addBlogResourceInput: AddBlogResourceInput!
        ) {
          adminAddBlogResource(addBlogResourceInput: $addBlogResourceInput) {
            data {
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
              enable_comments
              id
              pending_comments_count
              published_on
              tags
              title
              urlSlug
            }
            message
            status
          }
        }
      `,
      variables: {
        addBlogResourceInput: data,
      },
    });

    if (response?.data?.adminAddBlogResource?.status === SUCCESS) {
      // toast.success(successMsg || "record added successfully");
      return response?.data?.adminAddBlogResource?.data;
    }
    if (response?.data?.adminAddBlogResource?.status === ERROR) {
      console.error(response?.data?.adminAddBlogResource?.message);
      toast.error(response?.data?.adminAddBlogResource?.message);
      return {};
    }
  } catch (error: any) {
    console.error("GrapphQL Error:", error);
    return {};
  }

  // finally {
  //   setLoading && setLoading(false);
  // }
};

export const AdminGetBlogResourceById = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query AdminGetBlogResourceById($blogId: String!) {
          adminGetBlogResourceById(blog_id: $blogId) {
            data {
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
              enable_comments
              id
              pending_comments_count
              published_on
              tags
              title
              urlSlug
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.adminGetBlogResourceById?.status === SUCCESS) {
      return response?.data?.adminGetBlogResourceById?.data;
    }
    if (response?.data?.adminGetBlogResourceById?.status === ERROR) {
      console.error(response?.data?.adminGetBlogResourceById?.message);
      toast.error(response?.data?.adminGetBlogResourceById?.message);
      return {};
    }
  } catch (error: any) {
    toast.error(error.message || SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return {};
  } finally {
    setLoading && setLoading(false);
  }
};

export const AdminUpdateBlogResource = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation AdminUpdateBlogResource(
          $updateBlogResourceInput: UpdateBlogResourceInput!
        ) {
          adminUpdateBlogResource(
            updateBlogResourceInput: $updateBlogResourceInput
          ) {
            data {
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
              enable_comments
              id
              pending_comments_count
              published_on
              tags
              title
              urlSlug
            }
            message
            status
          }
        }
      `,
      variables: {
        updateBlogResourceInput: {
          ...data,
        },
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.adminUpdateBlogResource?.status === SUCCESS) {
      toast.success(successMsg || "Resource updated successfully");
      return true;
    }
    if (response?.data?.adminUpdateBlogResource?.status === ERROR) {
      console.error(response?.data?.adminUpdateBlogResource?.message);
      toast.error(response?.data?.adminUpdateBlogResource?.message);
      return false;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};

export const adminDeleteBlogResAttachment = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation AdminDeleteBlogResAttachment(
          $attachmentType: String!
          $blogResId: String
        ) {
          adminDeleteBlogResAttachment(
            attachmentType: $attachmentType
            blogResId: $blogResId
          ) {
            message
            status
          }
        }
      `,
      variables: {
        ...data,
      },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.adminDeleteBlogResAttachment?.status === SUCCESS) {
      toast.success(response?.data?.adminDeleteBlogResAttachment?.message);
      return true;
    }
    if (response?.data?.adminDeleteBlogResAttachment?.status === ERROR) {
      toast.error(response?.data?.adminDeleteBlogResAttachment?.message);
      return false;
    }
  } catch (error: any) {
    toast.error(error.message || "somehting went wrong in API");
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};

export const AdminListAllBlogComments = async (
  data: any,
  setLoading?: Function
): Promise<{ comments: BlogComment[]; totalCount: number } | any> => {
  try {
    const response = await client.query({
      query: gql`
        query AdminListAllBlogComments(
          $listBlogResourceInput: ListBlogCommentsInput!
        ) {
          adminListAllBlogComments(
            listBlogResourceInput: $listBlogResourceInput
          ) {
            data {
              blogDetails {
                blog_status
                id
                title
                updated_on
              }
              comments {
                blog {
                  blog_status
                  id
                  title
                  updated_on
                }
                comment
                comment_by
                comment_owner_name
                comment_status
                created_on
                id
                posted_on
              }
              totalCount
            }
            message
            status
          }
        }
      `,
      variables: {
        listBlogResourceInput: data,
      },
      fetchPolicy: "no-cache",
    });
    if (
      response &&
      response?.data?.adminListAllBlogComments?.status === SUCCESS
    ) {
      return response?.data?.adminListAllBlogComments?.data;
    }
    if (
      response &&
      response?.data?.adminListAllBlogComments?.status === ERROR
    ) {
      console.error(
        response && response?.data?.adminListAllBlogComments?.message
      );
      return null;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const AdminManageBlogComment = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation Mutation($manageBlogCommentInput: ManageBlogCommentInput!) {
          adminManageBlogComment(
            manageBlogCommentInput: $manageBlogCommentInput
          ) {
            status
            message
            data {
              blog {
                title
                id
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
      variables: {
        manageBlogCommentInput: {
          ...data,
        },
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.adminManageBlogComment?.status === SUCCESS) {
      toast.success(successMsg || "Comment status updated successfully");
      return true;
    }
    if (response?.data?.adminManageBlogComment?.status === ERROR) {
      console.error(response?.data?.adminManageBlogComment?.message);
      toast.error(response?.data?.adminManageBlogComment?.message);
      return false;
    }
  } catch (error: any) {
    toast.error(error.message || SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};

export const AdminListAllBlogResAuthors = async (
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query AdminListAllBlogResAuthors {
          adminListAllBlogResAuthors {
            data {
              blogResAuthors {
                email_id
                first_name
                id
                last_name
              }
              totalCount
            }
            message
            status
          }
        }
      `,

      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.adminListAllBlogResAuthors?.data?.blogResAuthors?.length >
      0
    ) {
      let authorData =
        response?.data?.adminListAllBlogResAuthors?.data?.blogResAuthors || [];
      let modifiedData = authorData?.map((each: any) => {
        return {
          value: each?.id,
          label: each?.first_name
            ? `${each.first_name} ${each?.last_name || ""}`
            : each?.last_name || "",
        };
      });
      return modifiedData;
    } else {
      console.error(
        response && response?.data?.adminListAllBlogResAuthors?.message
      );
      return [];
    }
  } catch (error: any) {
    // Handle errors
    toast.error(error?.message || SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return [];
  } finally {
    setLoading && setLoading(false);
  }
};
