//graphql - apollo client setup
import { gql } from "@apollo/client";
import { client } from "@/app/api/adminAPIs/adminAPIs";
//import from external libraries
import { toast } from "@/app/Toaster";
//module level constants and interfaces
import { SOMETHING_WENT_WRONG } from "@/common/constants/messages";

export async function fetchAllContacts(data: any): Promise<any> {
  try {
    const response = await client.mutate({
      mutation: gql`
        query FetchAllContacts($payload: FetchAllContactsInput!) {
          fetchAllContacts(payload: $payload) {
            data {
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
              totalCount
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
          search: data?.search,
          status: data?.status,
          start_date: data?.start_date,
          end_date: data?.end_date,
          date_filter: data?.date_filter?.value,
        },
      },
      fetchPolicy: "no-cache",
    });
    return response?.data?.fetchAllContacts || [];
  } catch (error: any) {
    toast.error(error.message || SOMETHING_WENT_WRONG);
    return [];
  }
}
