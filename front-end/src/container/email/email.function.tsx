//graphql - apollo client setup
import { gql } from "@apollo/client";
import { client } from "@/app/api/adminAPIs/adminAPIs";
//import from external libraries
import { toast } from "@/app/Toaster";
//module level constants and interfaces
import { SOMETHING_WENT_WRONG, SUCCESS } from "@/common/constants/messages";

export async function fetchEmailList(inputData: any): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query AdminListAllMailTemplates(
          $category: String
          $keyword: String
          $mailType: String
          $page: Int
          $perPage: Int
        ) {
          adminListAllMailTemplates(
            category: $category
            keyword: $keyword
            mailType: $mailType
            page: $page
            perPage: $perPage
          ) {
            message
            status
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
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.adminListAllMailTemplates?.status === SUCCESS) {
      return response?.data?.adminListAllMailTemplates?.data;
    } else {
      return [];
    }
  } catch (error: any) {
    toast.error(error.message || SOMETHING_WENT_WRONG);
    return [];
  }
}
