import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

export const CheckSubscriptionPlanNameExistence = async (
  planName: string
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query CheckSubscriptionPlanExistence($keyword: String!) {
          checkSubscriptionPlanExistence(keyword: $keyword) {
            data {
              description
              id
              plan_id
              plan_name
              plan_status
              plan_type
              stripe_product_id
            }
            message
            status
          }
        }
      `,
      variables: {
        keyword: planName,
      },
    });
    if (response?.data?.checkSubscriptionPlanExistence?.data?.length > 0) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
};

export const AdminListSubscriptionItems = async (data: any): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query AdminListSubscriptionItems($sortingOrder: String) {
          adminListSubscriptionItems(sortingOrder: $sortingOrder) {
            data {
              subscriptionItems {
                description
                dropdown_type
                id
                item_name
                item_status
                limit_type
                unit_type
              }
              totalCount
            }
            message
            status
          }
        }
      `,
      variables: {
        page: data?.page,
        perPage: data?.perPage,
        keyword: data?.keyWord,
        status: data?.status,
        planType: data?.planType,
      },
      fetchPolicy: "no-cache",
    });
    if (
      response &&
      response?.data?.adminListSubscriptionItems?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.adminListSubscriptionItems?.data;
    }
    if (
      response &&
      response?.data?.adminListSubscriptionItems?.status === ApiResponse.ERROR
    ) {
      return null;
    }
  } catch (error: any) {
    return null;
  }
};

export const AdminAddSubscriptionPlan = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation AdminAddSubscriptionAndPricing(
          $addSubscriptionPlanInput: AddSubscriptionPlanInput!
        ) {
          adminAddSubscriptionAndPricing(
            addSubscriptionPlanInput: $addSubscriptionPlanInput
          ) {
            data {
              description
              id
              plan_id
              plan_name
              plan_status
              plan_type
              stripe_product_id
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
      response?.data?.adminAddSubscriptionAndPricing?.status ===
      ApiResponse.SUCCESS
    ) {
      showSuccessToast(successMsg || "user added successfully");
      return true;
    }
    if (
      response?.data?.adminAddSubscriptionAndPricing?.status ===
      ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.adminAddSubscriptionAndPricing?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error);

    return false;
  }
};

export const AdminUpdateSubscriptionPlan = async (
  data: any,
  successMsg: string
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation AdminUpdateSubscriptionAndPricing(
          $updateSubscriptionPlanInput: UpdateSubscriptionPlanInput!
        ) {
          adminUpdateSubscriptionAndPricing(
            updateSubscriptionPlanInput: $updateSubscriptionPlanInput
          ) {
            data {
              description
              id
              plan_id
              plan_name
              plan_status
              plan_type
              stripe_product_id
            }
            message
            status
          }
        }
      `,
      variables: data,
      // fetchPolicy: "no-cache",
    });
    if (
      response?.data?.adminUpdateSubscriptionAndPricing?.status ===
      ApiResponse.SUCCESS
    ) {
      showSuccessToast(successMsg || "Subscription updated successfully");
      return true;
    }
    if (
      response?.data?.adminUpdateSubscriptionAndPricing?.status ===
      ApiResponse.ERROR
    ) {
      showErrorToast(
        response?.data?.adminUpdateSubscriptionAndPricing?.message
      );
      return false;
    }
  } catch (error: any) {
    return false;
  }
};
export const ViewSubscriptionPlanById = async (data: {
  id: string;
}): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query ViewSubscriptionPlanById($viewSubscriptionPlanByIdId: String!) {
          viewSubscriptionPlanById(id: $viewSubscriptionPlanByIdId) {
            data {
              description
              id
              monthly_bill_cycle
              monthly_is_active
              monthly_is_deleted
              monthly_price
              monthly_price_id
              monthly_price_name
              monthly_stripe_price_id
              plan_id
              plan_items {
                description
                dropdown_type
                id
                is_unlimited
                item_id
                item_name
                item_status
                limit_type
                limit_value
                plan_item_id
                unit_type
              }
              plan_name
              plan_status
              plan_type
              stripe_product_id
              trial_period
              unformatted_monthly_price
              unformatted_yearly_price
              yearly_bill_cycle
              yearly_is_active
              yearly_is_deleted
              yearly_price
              yearly_price_id
              yearly_price_name
              yearly_stripe_price_id
              is_sandbox
            }
            message
            status
          }
        }
      `,
      variables: {
        ...data,
      },
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.viewSubscriptionPlanById?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.viewSubscriptionPlanById?.data;
    }
    if (
      response?.data?.viewSubscriptionPlanById?.status === ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.viewSubscriptionPlanById?.message);
      return null;
    }
  } catch (error: any) {
    return null;
  }
};
