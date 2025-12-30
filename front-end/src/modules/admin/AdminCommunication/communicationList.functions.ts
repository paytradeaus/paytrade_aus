import { ERROR, SUCCESS } from "@/app/message";
import apolloClient from "@/network/apolloClient";
import { gql } from "@apollo/client";

export const FetchAllEmailsSentByAdmin = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query Data($payload: FetchAllSystemEmailsInput!) {
          fetchAllEmailsSentByAdmin(payload: $payload) {
            data {
              emails_list {
                body
                created_by
                created_on
                emailCcIds
                emailFromId
                id
                status
                subject
                toEmails
                type
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: {
        payload: {
          emailSentDateFrom: data?.startDate || null,
          emailSentDateTo: data?.endDate || null,
          page: data.page,
          itemsPerPage: data.perPage,
          date_filter: data.dateFilter,
          sorting_order: data?.sorting_order || "",
          sorting_field: data?.sorting_field || "",
        },
      },
      fetchPolicy: "no-cache",
    });
    if (
      response &&
      response?.data?.fetchAllEmailsSentByAdmin?.status === SUCCESS
    ) {
      return response?.data?.fetchAllEmailsSentByAdmin?.data;
    }
    if (
      response &&
      response?.data?.fetchAllEmailsSentByAdmin?.status === ERROR
    ) {
      console.error(
        response && response?.data?.fetchAllEmailsSentByAdmin?.message
      );
      return null;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
