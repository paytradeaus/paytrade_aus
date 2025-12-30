import { gql } from "@apollo/client";
import { toast } from "@/app/Toaster";
import { client } from "@/app/api/adminAPIs/adminAPIs";
import { SUCCESS } from "@/common/constants/messages";

export const getFAQList = async (): Promise<any> => {
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

      fetchPolicy: "no-cache",
    });
    if (response?.data?.adminListAllFaq?.status === SUCCESS) {
      return response?.data?.adminListAllFaq?.data?.FAQs;
    } else {
      return {};
    }
  } catch (error: any) {
    toast.error(error.message || "something went wrong in API");

    return false;
  }
};
