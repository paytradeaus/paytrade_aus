import { showErrorToast } from "@/components/Toaster";
import apolloClient from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

export async function fetchFiltersForAdminNotices(payload: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchFiltersForAdminNotices(
          $payload: FetchFiltersForNoticeInput!
        ) {
          fetchFiltersForAdminNotices(payload: $payload) {
            data {
              account_list {
                account_type
                name
                opening_date
                value
              }
              account_type_list {
                name
                value
              }
              company_list {
                name
                value
              }
              notice_type_list {
                name
                value
              }
              project_list {
                name
                value
              }
            }
            message
            status
          }
        }
      `,
      variables: { payload },
      fetchPolicy: "no-cache",
    });

    if (
      response &&
      response.data.fetchFiltersForAdminNotices.status === ApiResponse.SUCCESS
    ) {
      return response.data.fetchFiltersForAdminNotices.data;
    } else if (
      response &&
      response.data.fetchFiltersForAdminNotices.status === ApiResponse.ERROR
    ) {
      showErrorToast(response.data.fetchFiltersForAdminNotices.message);
      return null;
    }
  } catch (error: any) {
    return null;
  }
}
