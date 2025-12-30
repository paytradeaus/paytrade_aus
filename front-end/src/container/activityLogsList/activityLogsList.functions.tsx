import { gql } from "@apollo/client";
import { toast } from "@/app/Toaster";
import { client } from "@/app/api/adminAPIs/adminAPIs";
import {
  ERROR,
  SOMETHING_WENT_WRONG,
  SUCCESS,
} from "@/common/constants/messages";

export const GetActivityLogList = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.query({
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
              }
            }
            message
            status
          }
        }
      `,
      variables: {
        getActivityLogInput: {
          // admin_id: data?.id,
          event_group: data?.eventType || null,
          page_number: data?.page,
          page_size: data?.perPage,
          date_filter: data?.dateFilter || null,
          start_date: data?.startDate || null,
          end_date: data?.endDate || null,
          user_id: data?.user_id || null,
        },
      },
      fetchPolicy: "no-cache",
    });
    if (response && response?.data?.getActivityLog?.status === SUCCESS) {
      return response?.data?.getActivityLog?.data;
    }
    if (response && response?.data?.getActivityLog?.status === ERROR) {
      console.error(response && response?.data?.getActivityLog?.message);
      return null;
    }
  } catch (error: any) {
    toast.error(error.message || SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const GetEventGroupList = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query GetEventGroup {
          getEventGroup {
            data {
              name
              value
            }
            message
            status
          }
        }
      `,
      fetchPolicy: "no-cache",
    });
    return response?.data?.getEventGroup?.data || [];
  } catch (error: any) {
    toast.error(error.message || SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return [];
  } finally {
    setLoading && setLoading(false);
  }
};
