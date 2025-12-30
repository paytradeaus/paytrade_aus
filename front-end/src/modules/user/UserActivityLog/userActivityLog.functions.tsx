import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";
import { showErrorToast } from "@/components/Toaster";

export const GetActivityLogList = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetActivityLog($getActivityLogInput: GetActivityLogInput!) {
          getActivityLog(getActivityLogInput: $getActivityLogInput) {
            data {
              total_count
              activity_logs {
                company_email_id
                company_id
                company_name
                created_on
                dynamic_values
                email_id
                event_date
                event_group
                event_template_id
                event_text
                event_type
                first_name
                from_user
                is_admin
                last_name
                to_user
                timezone
              }
            }
            message
            status
          }
        }
      `,
      variables: {
        getActivityLogInput: {
          company_id: data.companyId,
          user_id: data.userId,
          event_group: data?.eventType || null,
          page_number: data?.page,
          page_size: data?.perPage,
          date_filter: data?.dateFilter || null,
          start_date: data?.startDate || null,
          end_date: data?.endDate || null,
          sorting_field: data?.sorting_field || "",
          sorting_order: data?.sorting_order || "",
        },
      },
      fetchPolicy: "no-cache",
    });
    return response?.data?.getActivityLog?.data || [];
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return [];
  } finally {
    setLoading && setLoading(false);
  }
};
