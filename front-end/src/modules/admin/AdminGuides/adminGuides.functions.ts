import { client } from "@/app/api/adminApi/adminApi";
import { gql } from "@apollo/client";

export const AdminFetchAdminGuides = async (payload: any) => {
  try {
    const response = await client.query({
      query: gql`
        query AdminListAllBlogResources(
          $page: Int!
          $perPage: Int!
          $keyWord: String
          $status: String
          $category: String
          $author: String
          $contentType: String
          $sortingOrder: String
          $sortingField: String
        ) {
          adminListAllBlogResources(
            page: $page
            perPage: $perPage
            keyWord: $keyWord
            status: $status
            category: $category
            author: $author
            contentType: $contentType
            sortingOrder: $sortingOrder
            sortingField: $sortingField
          ) {
            status
            message
            data {
              blogResources {
                id
                title
                content
                blog_status
                content_type
                urlSlug
                published_on
                created_on
                tags
                banner {
                  file_path
                }
                category {
                  id
                  value
                }
              }
              totalCount
            }
          }
        }
      `,
      variables: {
        page: payload.page,
        perPage: payload.perPage,
        keyWord: payload.keyWord || "",
        status: payload.status || "",
        category: payload.category || "Admin Panel",
        author: payload.author || "",
        contentType: "howToGuide",
        sortingOrder: payload.sortingOrder || "",
        sortingField: payload.sortingField || "",
      },
      fetchPolicy: "network-only",
    });

    if (
      response?.data?.adminListAllBlogResources?.status === "SUCCESS" &&
      response?.data?.adminListAllBlogResources?.data
    ) {
      return response.data.adminListAllBlogResources.data;
    }
    return { blogResources: [], totalCount: 0 };
  } catch (error: any) {
    console.error("Error fetching admin guides:", error);
    return { blogResources: [], totalCount: 0 };
  }
};
