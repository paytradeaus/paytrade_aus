import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { ERROR, SOMETHING_WENT_WRONG, SUCCESS } from "@/app/message";

export async function updatePageList(inputData: Object) {
  try {
    const response = await apolloClient.mutate({
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
      showSuccessToast("Page list updated successfully");
      return true;
    } else {
      showErrorToast(
        response?.data?.adminUpdateContent?.message || SOMETHING_WENT_WRONG
      );
      return false;
    }
  } catch (error: any) {
    // Handle errors
    showErrorToast(error?.message || SOMETHING_WENT_WRONG);
  }
}

export async function fetchPageList(inputData: any) {
  try {
    const response = await apolloClient.query({
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
    showErrorToast(error?.message || SOMETHING_WENT_WRONG);
  }
}
