import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import apolloClient from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

export async function fetchFaqList(data: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query AdminListAllFaq(
          $category: String
          $faqstatus: String
          $keyword: String
          $page: Int
          $perPage: Int
          $showInHome: Boolean
        ) {
          adminListAllFaq(
            category: $category
            faqstatus: $faqstatus
            keyword: $keyword
            page: $page
            perPage: $perPage
            show_in_home: $showInHome
          ) {
            data {
              FAQs {
                answer
                category {
                  id
                  value
                }
                faq_status
                id
                question
                show_in_home
              }
              showInHomeCount
              totalCount
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.adminListAllFaq?.status === ApiResponse.SUCCESS) {
      return response?.data?.adminListAllFaq?.data;
    } else {
      return {};
    }
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);
    return [];
  }
}

export async function postFaqOptions(inputData: Object) {
  try {
    const response = await apolloClient.mutate({
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

    // You can return any relevant data from the response
    if (response?.data?.adminUpdateFaq?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.adminUpdateFaq?.message);
      return true;
    } else {
      return false;
    }
  } catch (error: any) {
    // Handle errors
    showErrorToast(error?.message || ApiResponse.SOMETHING_WENT_WRONG);
  }
}

export async function fetchCategories() {
  try {
    const response = await apolloClient.query({
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
    return response.data || null;
  } catch (error: any) {
    console.log("fetchCategories ~ error:", error);
  }
}

export async function reorderFaq(inputData: Object) {
  try {
    const response: any = await apolloClient.mutate({
      mutation: gql`
        mutation AdminAddFAQ($updateOrderInput: UpdateOrderInput!) {
          adminUpdateFAQOrder(updateOrderInput: $updateOrderInput) {
            message
            status
          }
        }
      `,
      variables: inputData,
    });

    // You can return any relevant data from the response

    if (response?.data?.adminUpdateFAQOrder?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.adminUpdateFAQOrder?.message);
      return true;
    } else {
      showErrorToast(response?.data?.adminUpdateFAQOrder?.message);
      return false;
    }
  } catch (error: any) {
    // Handle errors
    showErrorToast(error?.message || ApiResponse.SOMETHING_WENT_WRONG);
    return false;
  }
}
