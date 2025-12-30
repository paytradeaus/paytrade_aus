import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

async function AdminListAllHolidays(data: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query AdminListAllHolidays(
          $sortingField: String
          $sortingOrder: String
          $perPage: Int
          $keyword: String
          $page: Int
        ) {
          adminListAllHolidays(
            sortingField: $sortingField
            sortingOrder: $sortingOrder
            perPage: $perPage
            keyword: $keyword
            page: $page
          ) {
            data {
              holidays {
                created_on
                holiday_date
                holiday_name
                holiday_status
                id
                recurring_every_year
              }
              totalCount
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });

    if (
      response &&
      response?.data?.adminListAllHolidays?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.adminListAllHolidays?.data;
    } else if (
      response &&
      response?.data?.adminListAllHolidays?.status === ApiResponse.ERROR
    ) {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

export { AdminListAllHolidays };
