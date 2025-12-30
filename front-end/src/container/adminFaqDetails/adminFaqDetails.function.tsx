//graphql - apollo client setup
import { gql } from "@apollo/client";
import { client } from "@/app/api/adminAPIs/adminAPIs";
//import from external libraries
import { toast } from "@/app/Toaster";
//module level constants and interfaces
import { SOMETHING_WENT_WRONG, SUCCESS } from "@/common/constants/messages";

export async function addFaq(inputData: Object) {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation AdminAddFAQ($addFaQInput: AddFaQInput!) {
          adminAddFAQ(addFaQInput: $addFaQInput) {
            data {
              answer
              category {
                id
                value
              }
              faq_status
              id
              question
            }
            message
            status
          }
        }
      `,
      variables: inputData,
    });

    // You can return any relevant data from the response
    if (response?.data?.adminAddFAQ?.status === SUCCESS) {
      return true;
    } else {
      return false;
    }
  } catch (error: any) {
    // Handle errors
    toast.error(SOMETHING_WENT_WRONG);
    return false;
  }
}

export async function fetchFaq(inputData: Object) {
  try {
    const response = await client.query({
      query: gql`
        query Query($faqId: String!) {
          adminGetFaqById(faq_id: $faqId) {
            message
            status
            data {
              answer
              category {
                id
                value
              }
              faq_status
              id
              question
            }
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.adminGetFaqById?.status === SUCCESS) {
      return response?.data?.adminGetFaqById?.data;
    } else {
      return false;
    }
  } catch (error: any) {
    // Handle errors
    toast.error(error?.message || SOMETHING_WENT_WRONG);
  }
}

export async function updateFaq(inputData: Object) {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation AdminUpdateFaq($updateFaqInput: UpdateFaQInput!) {
          adminUpdateFaq(updateFaqInput: $updateFaqInput) {
            message
            status
            data {
              answer
              category {
                id
                value
              }
              faq_status
              id
              question
            }
          }
        }
      `,
      variables: inputData,
    });

    if (response?.data?.adminUpdateFaq?.status === SUCCESS) {
      return true;
    } else {
      return false;
    }
  } catch (error: any) {
    // Handle errors
    toast.error(error?.message || SOMETHING_WENT_WRONG);
  }
}

export async function fetchCategories() {
  try {
    const response = await client.query({
      query: gql`
        query AdminfetchAllMasterTypeDetails($masterType: String) {
          adminfetchAllMasterTypeDetails(MasterType: $masterType) {
            data {
              description
              id
              master_type
              status
              value
            }
            message
            status
          }
        }
      `,
      variables: {
        masterType: "FAQ Category",
      },
    });

    // You can return any relevant data from the response
    return response.data;
  } catch (error: any) {
    console.log("fetchCategories ~ error:", error);
  }
}
