import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

export const AdminAddGiftCoupon = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation AddGiftCoupon($payload: AddGiftCouponInput!) {
          addGiftCoupon(payload: $payload) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.addGiftCoupon?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.addGiftCoupon?.message);
      return true;
    }

    if (response?.data?.addGiftCoupon?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.addGiftCoupon?.message);
      return false;
    }

    return false;
  } catch (error: any) {
    showErrorToast(error);
    return false;
  }
};

export const AdminGiftCouponById = async (
  id: string,
  successMsg?: string
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query AdminGiftCouponById($adminGiftCouponByIdId: String!) {
          adminGiftCouponById(id: $adminGiftCouponByIdId) {
            data {
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
            message
            status
          }
        }
      `,
      variables: { adminGiftCouponByIdId: id },
      fetchPolicy: "no-cache",
    });

    const result = response?.data?.adminGiftCouponById;

    if (result?.status === ApiResponse.SUCCESS) {
      if (successMsg) showSuccessToast(successMsg);
      return result?.data;
    }

    if (result?.status === ApiResponse.ERROR) {
      showErrorToast(result?.message);
      return null;
    }

    return null;
  } catch (error: any) {
    showErrorToast(error?.message || "Failed to fetch coupon details");
    return null;
  }
};

export const AdminUpdateGiftCoupon = async (
  data: any,
  setLoading?: Function
): Promise<boolean> => {
  try {
    setLoading?.(true);

    const response = await apolloClient.mutate({
      mutation: gql`
        mutation AdminUpdateGiftCoupon($payload: UpdateStripeCouponInput!) {
          adminUpdateGiftCoupon(payload: $payload) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });

    const result = response?.data?.adminUpdateGiftCoupon;

    if (result?.status === ApiResponse.SUCCESS) {
      showSuccessToast(result?.message);
      return true;
    }

    if (result?.status === ApiResponse.ERROR) {
      showErrorToast(result?.message || "Failed to update gift coupon");
      return false;
    }

    return false;
  } catch (error: any) {
    showErrorToast(error?.message || "Something went wrong while updating");
    return false;
  } finally {
    setLoading?.(false);
  }
};

export const CheckGiftCouponExistence = async (
  keyword: string
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query CheckGiftCouponExistence($keyword: String!) {
          checkGiftCouponExistence(keyword: $keyword) {
            data {
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
            message
            status
          }
        }
      `,
      variables: { keyword },
      fetchPolicy: "no-cache",
    });

    const result = response?.data?.checkGiftCouponExistence;

    if (result?.status === ApiResponse.SUCCESS) {
      return result?.data || null;
    }

    if (result?.status === ApiResponse.ERROR) {
      showErrorToast(result?.message || "Failed to fetch coupon details");
      return null;
    }

    return null;
  } catch (error: any) {
    showErrorToast(
      error?.message || "Something went wrong while checking coupon"
    );
    return null;
  }
};
