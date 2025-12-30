import { client } from "@/app/api/adminApi/adminApi";
import { ERROR, SOMETHING_WENT_WRONG, SUCCESS } from "@/app/message";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { gql } from "@apollo/client";
import { BlogResource } from "./blogList.types";

export const AdminFetchAllMasterTypeDetails = async (
  masterType: "Resource Category" | "Blog Category" | "How To Guide Category",
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
    showErrorToast(error?.message || SOMETHING_WENT_WRONG);
    return [];
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
    showErrorToast(error?.message || SOMETHING_WENT_WRONG);
    return [];
  } finally {
    setLoading && setLoading(false);
  }
};

export const AdminListAllBlogResources = async (
  data: any,
  setLoading?: Function
): Promise<{ admins: BlogResource[]; totalCount: number } | any> => {
  try {
    const response = await client.query({
      query: gql`
        query AdminListAllBlogResources(
          $listBlogResourceInput: ListBlogResourceInput!
        ) {
          adminListAllBlogResources(
            listBlogResourceInput: $listBlogResourceInput
          ) {
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
                enable_comments
                id
                pending_comments_count
                published_on
                tags
                title
                urlSlug
              }
              totalCount
            }
            message
            status
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
          sorting_order: data?.sortingOrder || "",
          sorting_field: data?.sortingField || "",
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
      showSuccessToast(successMsg || "Resource updated successfully");
      return true;
    }
    if (response?.data?.adminUpdateBlogResource?.status === ERROR) {
      showErrorToast(response?.data?.adminUpdateBlogResource?.message);
      return false;
    }
  } catch (error: any) {
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};
