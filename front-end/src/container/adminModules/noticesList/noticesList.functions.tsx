import { gql } from "@apollo/client";
import { toast } from "@/app/Toaster";
import { client } from "@/app/api/adminAPIs/adminAPIs";

const SUCCESS = "SUCCESS"; // Define these constants as per your application's response handling
const ERROR = "ERROR";

export const fetchFiltersForAdminNotices = async (
  payload: any,
  setLoading?: Function
): Promise<any> => {
  try {
    setLoading && setLoading(true);

    const response = await client.query({
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
      response.data.fetchFiltersForAdminNotices.status === "SUCCESS"
    ) {
      return response.data.fetchFiltersForAdminNotices.data;
    }

    if (
      response &&
      response.data.fetchFiltersForAdminNotices.status === "ERROR"
    ) {
      toast.error(response.data.fetchFiltersForAdminNotices.message);
      return null;
    }
  } catch (error: any) {
    console.error("Error fetching filters for admin notices:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
