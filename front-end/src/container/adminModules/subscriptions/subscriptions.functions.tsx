import { toast } from "@/app/Toaster";
import { client } from "@/app/api/apolloClientServices";
import { gql } from "@apollo/client";
import { SubscriptionPlan } from "./subscriptions.types";
import { ERROR, SUCCESS } from "@/common/constants/messages";

export const AdminListSubscriptionPlans = async (
  data: any,
  setLoading?: Function
): Promise<
  { subscriptionPlans: SubscriptionPlan[]; totalCount: number } | any
> => {
  try {
    const response = await client.query({
      query: gql`
        query GetAllSubscriptionPlanList(
          $getAllSubscriptionPlanInput: GetAllSubscriptionPlanInput!
        ) {
          getAllSubscriptionPlanList(
            getAllSubscriptionPlanInput: $getAllSubscriptionPlanInput
          ) {
            data {
              plan_list {
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
                  id
                  item_id
                  item_name
                  item_status
                }
                plan_name
                plan_status
                plan_type
                stripe_product_id
                trial_period
                yearly_bill_cycle
                yearly_is_active
                yearly_is_deleted
                yearly_price
                yearly_price_id
                yearly_price_name
                yearly_stripe_price_id
              }
              total_count
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
      response?.data?.getAllSubscriptionPlanList?.status === SUCCESS
    ) {
      return response?.data?.getAllSubscriptionPlanList?.data;
    }
    if (
      response &&
      response?.data?.getAllSubscriptionPlanList?.status === ERROR
    ) {
      return null;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return [];
  } finally {
    setLoading && setLoading(false);
  }
};

export const AdminAddSubscriptionPlan = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
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
    if (response?.data?.adminAddSubscriptionAndPricing?.status === SUCCESS) {
      toast.success(successMsg || "user added successfully");
      return true;
    }
    if (response?.data?.adminAddSubscriptionAndPricing?.status === ERROR) {
      toast.error(response?.data?.adminAddSubscriptionAndPricing?.message);
      return false;
    }
  } catch (error: any) {
    toast.error(error);
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};
export const ViewSubscriptionPlanById = async (
  data: { id: string },
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query ViewSubscriptionPlanById($id: String!) {
          viewSubscriptionPlanById(id: $id) {
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
                id
                item_id
                item_name
                item_status
              }
              plan_name
              plan_status
              plan_type
              stripe_product_id
              trial_period
              yearly_bill_cycle
              yearly_is_active
              yearly_is_deleted
              yearly_price
              yearly_price_id
              yearly_price_name
              yearly_stripe_price_id
              unformatted_monthly_price
              unformatted_yearly_price
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
    if (response?.data?.viewSubscriptionPlanById?.status === SUCCESS) {
      return response?.data?.viewSubscriptionPlanById?.data;
    }
    if (response?.data?.viewSubscriptionPlanById?.status === ERROR) {
      toast.error(response?.data?.viewSubscriptionPlanById?.message);
      return null;
    }
  } catch (error: any) {
    return null;
  }
};

export const AdminUpdateSubscriptionPlan = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
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
    if (response?.data?.adminUpdateSubscriptionAndPricing?.status === SUCCESS) {
      toast.success(successMsg || "Subscription updated successfully");
      return true;
    }
    if (response?.data?.adminUpdateSubscriptionAndPricing?.status === ERROR) {
      toast.error(response?.data?.adminUpdateSubscriptionAndPricing?.message);
      return false;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  }
};

export const AdminListSubscriptionItems = async (
  data: any,
  setLoading?: Function
): Promise<
  { subscriptionPlans: SubscriptionPlan[]; totalCount: number } | any
> => {
  try {
    const response = await client.query({
      query: gql`
        query AdminListSubscriptionItems(
          $keyword: String
          $page: Int
          $perPage: Int
          $status: String
        ) {
          adminListSubscriptionItems(
            keyword: $keyword
            page: $page
            perPage: $perPage
            status: $status
          ) {
            data {
              subscriptionItems {
                description
                id
                item_name
                item_status
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
      response?.data?.adminListSubscriptionItems?.status === SUCCESS
    ) {
      return response?.data?.adminListSubscriptionItems?.data;
    }
    if (
      response &&
      response?.data?.adminListSubscriptionItems?.status === ERROR
    ) {
      console.error(response?.data?.adminListSubscriptionItems?.message);
      return null;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return [];
  } finally {
    setLoading && setLoading(false);
  }
};
