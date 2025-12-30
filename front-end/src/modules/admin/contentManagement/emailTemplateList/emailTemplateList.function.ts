import { showErrorToast } from "@/components/Toaster";
import apolloClient from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

export async function fetchEmailList(inputData: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query AdminListAllMailTemplates(
          $sortingOrder: String
          $sortingField: String
          $perPage: Int
          $page: Int
          $mailType: String
          $keyword: String
          $category: String
        ) {
          adminListAllMailTemplates(
            sortingOrder: $sortingOrder
            sortingField: $sortingField
            perPage: $perPage
            page: $page
            mailType: $mailType
            keyword: $keyword
            category: $category
          ) {
            data {
              mailTemplates {
                available_dynamic
                category
                email_content
                email_subject
                id
                selected_dynamic
                updated_on
              }
              totalCount
            }
            message
            status
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.adminListAllMailTemplates?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.adminListAllMailTemplates?.data;
    } else {
      return [];
    }
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);
    return [];
  }
}
