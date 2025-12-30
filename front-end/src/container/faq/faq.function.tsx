//graphql - apollo client setup
import { gql } from "@apollo/client";
import { client } from "@/app/api/adminAPIs/adminAPIs";
//import from external libraries
import { toast } from "@/app/Toaster";
//module level constants and interfaces
import { SOMETHING_WENT_WRONG, SUCCESS } from "@/common/constants/messages";

export async function fetchFaqList(data: any): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query Query(
          $category: String
          $faqstatus: String
          $keyword: String
          $page: Int
          $perPage: Int
        ) {
          adminListAllFaq(
            category: $category
            faqstatus: $faqstatus
            keyword: $keyword
            page: $page
            perPage: $perPage
          ) {
            message
            status
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
              }
              totalCount
            }
          }
        }
      `,
      variables: {
        category: data?.category?.value ?? "",
        keyword: data?.keyword ?? "",
        page: data.page,
        perPage: data.perPage,
        faqstatus: data?.status?.value ?? "",
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.adminListAllFaq?.status === SUCCESS) {
      return response?.data?.adminListAllFaq?.data;
    } else {
      return {};
    }
  } catch (error: any) {
    toast.error(error.message || SOMETHING_WENT_WRONG);
    return [];
  }
}

export async function postFaqOptions(inputData: Object) {
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

    // You can return any relevant data from the response
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

export async function reorderFaq(inputData: Object) {
  try {
    const response: any = await client.mutate({
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

    if (response?.data?.adminUpdateFAQOrder?.status === SUCCESS) {
      toast.success(response?.data?.adminUpdateFAQOrder?.message);
      return true;
    } else {
      toast.error(response?.data?.adminUpdateFAQOrder?.message);
      return false;
    }
  } catch (error: any) {
    // Handle errors
    toast.error(error?.message || SOMETHING_WENT_WRONG);
    return false;
  }
}
