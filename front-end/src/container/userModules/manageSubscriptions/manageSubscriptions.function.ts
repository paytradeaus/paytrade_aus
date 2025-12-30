import { client } from "@/app/api/apolloClientServices";
import { toast } from "@/app/Toaster";
import { getCompanyIdFromCookies } from "@/common/commonFunctions";
import {
  ERROR,
  SOMETHING_WENT_WRONG,
  SUCCESS,
} from "@/common/constants/messages";
import { gql } from "@apollo/client";

export interface CancelSubscriptionInput {
  companyId: number | any;
}

export async function fetchGetAllSubscriptionPlanListForUser(): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query GetAllSubscriptionPlanListForUser {
          getAllSubscriptionPlanListForUser {
            data {
              monthly_plan_list {
                bill_cycle
                description
                id
                is_active
                is_deleted
                plan_id
                plan_items {
                  description
                  id
                  item_id
                  item_name
                  item_status
                  plan_item_id
                }
                plan_name
                plan_status
                plan_type
                price
                price_id
                price_name
                stripe_price_id
                stripe_product_id
                trial_period
                unformatted_price
              }
              yearly_plan_list {
                bill_cycle
                description
                id
                is_active
                is_deleted
                plan_id
                plan_items {
                  description
                  id
                  item_id
                  item_name
                  item_status
                  plan_item_id
                }
                plan_name
                plan_status
                plan_type
                price
                price_id
                price_name
                stripe_price_id
                stripe_product_id
                trial_period
                unformatted_price
              }
              free_plan {
                bill_cycle
                description
                id
                is_active
                is_deleted
                plan_id
                plan_items {
                  description
                  id
                  item_id
                  item_name
                  item_status
                  plan_item_id
                }
                plan_name
                plan_status
                plan_type
                price
                price_id
                price_name
                stripe_price_id
                stripe_product_id
                trial_period
                unformatted_price
              }
            }
            message
            status
          }
        }
      `,

      fetchPolicy: "no-cache",
    });

    const { status, data } = response?.data?.getAllSubscriptionPlanListForUser;

    return status === SUCCESS ? data : null;
  } catch (error: any) {
    return false;
  }
}

export async function fetchAdminListSubscriptionItems(): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query AdminListSubscriptionItems(
          $status: String
          $keyword: String
          $page: Int
          $perPage: Int
        ) {
          adminListSubscriptionItems(
            status: $status
            keyword: $keyword
            page: $page
            perPage: $perPage
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
        status: "Active",
        keyword: null,
        page: null,
        perPage: null,
      },
      fetchPolicy: "no-cache",
    });

    const { status, data } = response?.data?.adminListSubscriptionItems;

    return status === SUCCESS ? data : null;
  } catch (error: any) {
    return false;
  }
}

export async function upgradeSubscriptionPlan(postData: any): Promise<any> {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation UpgradeSubscription(
          $createOrUpdateSubscriptionInput: CreateOrUpdateSubscriptionInput!
        ) {
          upgradeSubscription(
            createOrUpdateSubscriptionInput: $createOrUpdateSubscriptionInput
          ) {
            data {
              company_id
              id
              plan_id
              status
              subscription_id
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.upgradeSubscription?.status === SUCCESS) {
      toast.success(response?.data?.upgradeSubscription?.message);
      return true;
    }
    if (response?.data?.upgradeSubscription?.status === ERROR) {
      toast.error(response?.data?.upgradeSubscription?.message);
      return false;
    }
  } catch (error: any) {
    toast.error(error?.message);
  }
}

export async function getSubscriptionDetailsByCompanyId(): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query GetSubscriptionDetailsByCompanyId($company_id: Float!) {
          getSubscriptionDetailsByCompanyId(company_id: $company_id) {
            data {
              amount
              annual_price_amount
              annual_price_id
              bill_cycle
              canceled_at
              card_type
              company_id
              company_name
              expiry_date
              expiry_month
              expiry_year
              has_annual_billing
              has_upgrade_plans
              id
              is_default
              last_four_digits
              name_on_card
              payment_method_id
              plan_id
              plan_name
              plan_status
              plan_type
              price_id
              signature
              start_date
              status
              stripe_customer_id
              stripe_subscription_id
              subscription_id
              trial_end
              trial_period
              trial_start
              unformatted_annual_price_amount
              signature_type
            }
            message
            status
          }
        }
      `,
      variables: {
        company_id: getCompanyIdFromCookies(),
      },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.getSubscriptionDetailsByCompanyId?.status === SUCCESS) {
      return response?.data?.getSubscriptionDetailsByCompanyId?.data;
    } else {
      return null;
    }
  } catch (error: any) {
    return false;
  }
}

export async function getCardDetailsByCompanyId(): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query GetCardDetailsByCompanyId($company_id: Float!) {
          getCardDetailsByCompanyId(company_id: $company_id) {
            data {
              card_type
              expiry_month
              expiry_year
              is_default
              last_four_digits
              name_on_card
              payment_method_id
            }
            message
            status
          }
        }
      `,
      variables: {
        company_id: getCompanyIdFromCookies(),
      },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.getCardDetailsByCompanyId?.status === SUCCESS) {
      return response?.data?.getCardDetailsByCompanyId?.data;
    } else {
      return null;
    }
  } catch (error: any) {
    return false;
  }
}

export async function getAllCardDetailsByCompanyId(): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query GetAllCardDetailsByCompanyId($company_id: Float!) {
          getAllCardDetailsByCompanyId(company_id: $company_id) {
            data {
              card_type
              expiry_month
              expiry_year
              last_four_digits
              name_on_card
              payment_method_id
              is_default
              customer_id
            }
            message
            status
          }
        }
      `,
      variables: {
        company_id: getCompanyIdFromCookies(),
      },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.getAllCardDetailsByCompanyId?.status === SUCCESS) {
      return response?.data?.getAllCardDetailsByCompanyId?.data;
    } else {
      return null;
    }
  } catch (error: any) {
    return false;
  }
}

export const cancelSubscriptionForUser = async (
  data: CancelSubscriptionInput,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation CancelSubscriptionForUser($companyId: Float!) {
          cancelSubscriptionForUser(company_id: $companyId) {
            data {
              company_id
              id
              plan_id
              status
              subscription_id
            }
            message
            status
          }
        }
      `,
      variables: {
        companyId: data.companyId,
      },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.cancelSubscriptionForUser?.status === "SUCCESS") {
      toast.success(response?.data?.cancelSubscriptionForUser?.message);
      return true;
    }
    if (response?.data?.cancelSubscriptionForUser?.status === "ERROR") {
      toast.error(response?.data?.cancelSubscriptionForUser?.message);
      return false;
    }
    return false;
  } catch (error: any) {
    toast.error(error.message || "Something went wrong in API");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const setAsDefaultByPaymentMethodId = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation SetAsDefaultByPaymentMethodId(
          $customer_id: String!
          $payment_method_id: String!
        ) {
          setAsDefaultByPaymentMethodId(
            customer_id: $customer_id
            payment_method_id: $payment_method_id
          ) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.setAsDefaultByPaymentMethodId?.status === SUCCESS) {
      toast.success(response?.data?.setAsDefaultByPaymentMethodId?.message);
      return true;
    }
    if (response?.data?.setAsDefaultByPaymentMethodId?.status === ERROR) {
      toast.error(response?.data?.setAsDefaultByPaymentMethodId?.message);
      return false;
    }
    return false;
  } catch (error: any) {
    toast.error(error.message || SOMETHING_WENT_WRONG);
    return null;
  }
};

export const deleteCardByPaymentMethodId = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation DeleteCardByPaymentMethodId(
          $paymentMethodId: String!
          $companyId: Float!
        ) {
          deleteCardByPaymentMethodId(
            payment_method_id: $paymentMethodId
            company_id: $companyId
          ) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.deleteCardByPaymentMethodId?.status === SUCCESS) {
      toast.success(response?.data?.deleteCardByPaymentMethodId?.message);
      return true;
    }
    if (response?.data?.deleteCardByPaymentMethodId?.status === ERROR) {
      toast.error(response?.data?.deleteCardByPaymentMethodId?.message);
      return false;
    }
    return false;
  } catch (error: any) {
    toast.error(error.message || SOMETHING_WENT_WRONG);
    return null;
  }
};

export const updatePaymentMethodForSubscription = async (
  data: any
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation UpdatePaymentMethodForSubscription(
          $payment_method_id: String!
          $subscription_id: Float!
        ) {
          updatePaymentMethodForSubscription(
            payment_method_id: $payment_method_id
            subscription_id: $subscription_id
          ) {
            data {
              company_id
              id
              plan_id
              status
              subscription_id
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
      response?.data?.updatePaymentMethodForSubscription?.status === SUCCESS
    ) {
      toast.success(
        response?.data?.updatePaymentMethodForSubscription?.message
      );
      return true;
    }
    if (response?.data?.updatePaymentMethodForSubscription?.status === ERROR) {
      toast.error(response?.data?.updatePaymentMethodForSubscription?.message);
      return false;
    }
    return false;
  } catch (error: any) {
    toast.error(error.message || SOMETHING_WENT_WRONG);
    return null;
  }
};

export async function associatePaymentMethodToCustomer(
  postData: any
): Promise<any> {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation AssociatePaymentMethodToCustomer(
          $company_id: Float!
          $payment_method_id: String!
        ) {
          associatePaymentMethodToCustomer(
            company_id: $company_id
            payment_method_id: $payment_method_id
          ) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.associatePaymentMethodToCustomer?.status === SUCCESS) {
      toast.success(response?.data?.associatePaymentMethodToCustomer?.message);
      return true;
    }
    if (response?.data?.associatePaymentMethodToCustomer?.status === ERROR) {
      toast.error(response?.data?.associatePaymentMethodToCustomer?.message);
      return false;
    }
  } catch (error: any) {
    return false;
  }
}
