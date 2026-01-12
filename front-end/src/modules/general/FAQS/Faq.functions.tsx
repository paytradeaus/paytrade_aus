import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { SOMETHING_WENT_WRONG } from "@/app/message";

export interface FAQ {
  id: string;
  question: string;
  answer: string;
}

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
      variables: {
        category: data?.category?.value ?? "",
        keyword: data?.keyword ?? "",
        page: data.page,
        perPage: data.perPage,
        faqstatus: data?.status ?? "",
        showInHome: data?.showInHome,
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.adminListAllFaq?.status === ApiResponse.SUCCESS) {
      return response?.data?.adminListAllFaq?.data;
    } else {
      return {};
    }
  } catch (error: any) {
    console.error("Error fetching FAQ list:", error.message || SOMETHING_WENT_WRONG);
    if (typeof window !== "undefined") {
      showErrorToast(error.message || SOMETHING_WENT_WRONG);
    }
    return [];
  }
}
