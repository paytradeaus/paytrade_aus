import { gql } from "@apollo/client";
import { toast } from "@/app/Toaster";
import { client } from "@/app/api/adminAPIs/adminAPIs";
import { ERROR, SUCCESS } from "@/common/constants/messages";

export const FetchAllEmailsSentByAdmin = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.query({
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
