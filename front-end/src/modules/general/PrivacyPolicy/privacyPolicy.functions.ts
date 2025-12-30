import { showErrorToast } from "@/components/Toaster";
import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

export async function fetchPrivacyPolicy(): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query AdminGetContentByHead($contentHeading: String!) {
          adminGetContentByHead(content_heading: $contentHeading) {
            message
            status
            data {
              pageType
              body
              heading
              id
              status
              updated_on
            }
          }
        }
      `,
      variables: {
        contentHeading: "Privacy Policy",
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.adminGetContentByHead?.status === ApiResponse.SUCCESS) {
      return response?.data?.adminGetContentByHead?.data?.body;
    } else {
      return {};
    }
  } catch (error: any) {
    showErrorToast(error.message);
    return [];
  }
}
