//graphql - apollo client setup
import { gql } from "@apollo/client";
import { client } from "@/app/api/adminAPIs/adminAPIs";
//import from external libraries
import { toast } from "@/app/Toaster";
//module level constants and interfaces
import { SOMETHING_WENT_WRONG, SUCCESS } from "@/common/constants/messages";

export async function updatePageList(inputData: Object) {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation AdminUpdateContent($updateContentInput: UpdateContentInput!) {
          adminUpdateContent(updateContentInput: $updateContentInput) {
            data {
              body
              heading
              id
              pageType
              status
              updated_on
            }
            message
            status
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.adminUpdateContent?.status === SUCCESS) {
      toast.success("Page list updated successfully");
      return true;
    } else {
      toast.error(
        response?.data?.adminUpdateContent?.message || SOMETHING_WENT_WRONG
      );
      return false;
    }
  } catch (error: any) {
    // Handle errors
    toast.error(error?.message || SOMETHING_WENT_WRONG);
  }
}

export async function fetchPageList(inputData: any) {
  try {
    const response = await client.query({
      query: gql`
        query AdminGetContentById($contentId: String!) {
          adminGetContentById(content_id: $contentId) {
            data {
              body
              heading
              id
              pageType
              status
              updated_on
            }
            message
            status
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });

    // You can return any relevant data from the response
    if (response?.data?.adminGetContentById?.status === SUCCESS) {
      return response?.data?.adminGetContentById?.data;
    } else {
      return {};
    }
  } catch (error: any) {
    // Handle errors
    toast.error(error?.message || SOMETHING_WENT_WRONG);
  }
}
