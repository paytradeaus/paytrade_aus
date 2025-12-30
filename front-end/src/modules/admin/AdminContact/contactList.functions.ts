import { ERROR, SOMETHING_WENT_WRONG, SUCCESS } from "@/app/message";
import { showErrorToast } from "@/components/Toaster";
import apolloClient from "@/network/apolloClient";
import { gql } from "@apollo/client";

export async function fetchAllContacts(data: any): Promise<any> {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        query FetchAllSupportTicket($payload: FetchAllTicketsInput!) {
          fetchAllSupportTicket(payload: $payload) {
            data {
              totalCount
              contacts {
                companyName
                created_on
                email
                id
                isViewed
                message
                name
                status
              }
            }
            message
            status
          }
        }
      `,
      variables: {
        payload: {
          page_number: data.page,
          page_size: data.perPage,
          search: data.search,
          status: data?.status,
          start_date: data?.start_date,
          end_date: data?.end_date,
          date_filter: data?.date_filter,
          sorting_order: data?.sorting_order || "",
          sorting_field: data?.sorting_field || "",
        },
      },
      fetchPolicy: "no-cache",
    });
    return response?.data?.fetchAllSupportTicket || [];
  } catch (error: any) {
    showErrorToast(error.message || SOMETHING_WENT_WRONG);
    return [];
  }
}
