import { showErrorToast } from "@/components/Toaster";
import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

export async function AdminGiftCouponList(data: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query AdminGiftCouponList(
          $keyword: String
          $page: Int
          $perPage: Int
          $sortingField: String
          $sortingOrder: String
          $status: String
        ) {
          adminGiftCouponList(
            keyword: $keyword
            page: $page
            perPage: $perPage
            sortingField: $sortingField
            sortingOrder: $sortingOrder
            status: $status
          ) {
            message
            status
            data {
              total_count
              list {
                coupon_id
                coupon_name
                coupon_status
                created_by
                created_on
                duration
                duration_in_months
                id
                percent_off
                stripe_coupon_id
                updated_by
                updated_on
              }
            }
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });

    if (
      response &&
      response?.data?.adminGiftCouponList?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.adminGiftCouponList?.data;
    }

    if (
      response &&
      response?.data?.adminGiftCouponList?.status === ApiResponse.ERROR
    ) {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}
