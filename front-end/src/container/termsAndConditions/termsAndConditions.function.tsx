//graphql - apollo client setup
import { gql } from "@apollo/client";
import { client } from "@/app/api/adminAPIs/adminAPIs";
//import from external libraries
import { toast } from "@/app/Toaster";
//module level constants and interfaces
import { SOMETHING_WENT_WRONG, SUCCESS } from "@/common/constants/messages";

export async function fetchTermsAndConditions(): Promise<any> {
  try {
    const response = await client.query({
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
        contentHeading: "Terms and Conditions",
      },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.adminGetContentByHead?.status === SUCCESS) {
      return response?.data?.adminGetContentByHead?.data?.body;
    } else {
      return {};
    }
  } catch (error: any) {
    toast.error(error.message || SOMETHING_WENT_WRONG);
    return [];
  }
}
