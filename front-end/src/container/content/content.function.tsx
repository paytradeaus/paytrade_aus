//graphql - apollo client setup
import { gql } from "@apollo/client";
import { client } from "@/app/api/adminAPIs/adminAPIs";
//import from external libraries
import { toast } from "@/app/Toaster";
//module level constants and interfaces
import { SOMETHING_WENT_WRONG, SUCCESS } from "@/common/constants/messages";

export async function fetchPageList(inputData: any): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query AdminListAllContents(
          $perPage: Int
          $pageType: String
          $page: Int
          $keyword: String
        ) {
          adminListAllContents(
            perPage: $perPage
            pageType: $pageType
            page: $page
            keyword: $keyword
          ) {
            message
            status
            data {
              Contents {
                body
                heading
                id
                status
                updated_on
              }
              totalCount
            }
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.adminListAllContents?.status === SUCCESS) {
      return response?.data?.adminListAllContents?.data;
    } else {
      return {};
    }
  } catch (error: any) {
    toast.error(error.message || SOMETHING_WENT_WRONG);
    return [];
  }
}
