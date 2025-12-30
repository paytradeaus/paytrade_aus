import { showErrorToast } from "@/components/Toaster";
import apolloClient from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

export async function AdminListAllContents(inputData: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query AdminListAllContents(
          $keyword: String
          $page: Int
          $pageType: String
          $perPage: Int
          $sortingField: String
          $sortingOrder: String
        ) {
          adminListAllContents(
            keyword: $keyword
            page: $page
            pageType: $pageType
            perPage: $perPage
            sortingField: $sortingField
            sortingOrder: $sortingOrder
          ) {
            data {
              Contents {
                body
                heading
                id
                pageType
                status
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
    if (response?.data?.adminListAllContents?.status === ApiResponse.SUCCESS) {
      return response?.data?.adminListAllContents?.data;
    } else {
      return {};
    }
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);
    return [];
  }
}
