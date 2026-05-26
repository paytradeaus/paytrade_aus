import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { getCompanyIdFromStorage } from "@/utils";
import { gql } from "@apollo/client";

export async function getSubscriptionDetailsByCompanyId(): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetSubscriptionDetailsByCompanyId($companyId: Float!) {
          getSubscriptionDetailsByCompanyId(company_id: $companyId) {
            data {
              amount
              annual_price_amount
              annual_price_id
              bill_cycle
              canceled_at
              card_type
              company_id
              company_name
              coupon_id
              coupon_name
              coupon_status
              duration
              duration_in_months
              expiry_date
              expiry_month
              expiry_year
              free_plan_reason
              has_annual_billing
              has_upgrade_plans
              id
              is_default
              is_free_plan_eligible
              last_four_digits
              name_on_card
              payment_method_id
              percent_off
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
              price_id
              signature
              signature_type
              start_date
              status
              stripe_customer_id
              stripe_subscription_id
              subscription_id
              trial_end
              trial_period
              monthly_ai_credit
              trial_start
              unformatted_annual_price_amount
              is_demo
            }
            message
            status
          }
        }
      `,
      variables: {
        companyId: getCompanyIdFromStorage(),
      },
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.getSubscriptionDetailsByCompanyId?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.getSubscriptionDetailsByCompanyId?.data;
    } else {
      return null;
    }
  } catch (error: any) {
    return false;
  }
}

export async function fetchCompanyDemoStatus(): Promise<boolean> {
  try {
    const companyId = getCompanyIdFromStorage();
    if (!companyId) return false;
    const response = await apolloClient.query({
      query: gql`
        query GetCompanyDemoStatus($companyId: Float!) {
          getCompanyDemoStatus(company_id: $companyId) {
            data
            message
            status
          }
        }
      `,
      variables: { companyId: +companyId },
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.getCompanyDemoStatus?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.getCompanyDemoStatus?.data === true;
    }
    return false;
  } catch (error: any) {
    return false;
  }
}

export async function fetchAdminListSubscriptionItems(): Promise<any> {
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
        status: "Active",
        keyword: null,
        page: null,
        perPage: null,
      },
      fetchPolicy: "no-cache",
    });

    const { status, data } = response?.data?.adminListSubscriptionItems || {};

    return status === ApiResponse.SUCCESS ? data : null;
  } catch (error: any) {
    return false;
  }
}
export async function associatePaymentMethodToCustomer(
  postData: any
): Promise<any> {
  try {
    const response = await apolloClient.mutate({
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

    if (
      response?.data?.associatePaymentMethodToCustomer?.status ===
      ApiResponse.SUCCESS
    ) {
      showSuccessToast(
        response?.data?.associatePaymentMethodToCustomer?.message
      );
      return true;
    }
    if (
      response?.data?.associatePaymentMethodToCustomer?.status ===
      ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.associatePaymentMethodToCustomer?.message);
      return false;
    }
  } catch (error: any) {
    return false;
  }
}
export async function getCardDetailsByCompanyId(): Promise<any> {
  try {
    const response = await apolloClient.query({
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
        company_id: getCompanyIdFromStorage(),
      },
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.getCardDetailsByCompanyId?.status === ApiResponse.SUCCESS
    ) {
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
    const response = await apolloClient.query({
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
        company_id: getCompanyIdFromStorage(),
      },
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.getAllCardDetailsByCompanyId?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.getAllCardDetailsByCompanyId?.data;
    } else {
      return null;
    }
  } catch (error: any) {
    return false;
  }
}
export async function upgradeSubscriptionPlan(postData: any): Promise<any> {
  try {
    const response = await apolloClient.mutate({
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

    if (response?.data?.upgradeSubscription?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.upgradeSubscription?.message);
      return true;
    }
    if (response?.data?.upgradeSubscription?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.upgradeSubscription?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error?.message);
  }
}
export const setAsDefaultByPaymentMethodId = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
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

    if (
      response?.data?.setAsDefaultByPaymentMethodId?.status ===
      ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.setAsDefaultByPaymentMethodId?.message);
      return true;
    }
    if (
      response?.data?.setAsDefaultByPaymentMethodId?.status ===
      ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.setAsDefaultByPaymentMethodId?.message);
      return false;
    }
    return false;
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);
    return null;
  }
};
export const deleteCardByPaymentMethodId = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
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

    if (
      response?.data?.deleteCardByPaymentMethodId?.status ===
      ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.deleteCardByPaymentMethodId?.message);
      return true;
    }
    if (
      response?.data?.deleteCardByPaymentMethodId?.status === ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.deleteCardByPaymentMethodId?.message);
      return false;
    }
    return false;
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);
    return null;
  }
};
export async function getPaymentHistoryByCompanyId(
  getPaymentHistoryInput: any
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetPaymentHistoryByCompanyId(
          $getPaymentHistoryInput: GetPaymentHistoryInput!
        ) {
          getPaymentHistoryByCompanyId(
            getPaymentHistoryInput: $getPaymentHistoryInput
          ) {
            data {
              payment_history {
                amount_paid
                attempt_count
                attempted
                company_id
                company_name
                customer_id
                effective_at
                expiry_date
                hosted_invoice_url
                id
                invoice_id
                invoice_number
                invoice_pdf
                next_payment_attempt
                paid_at
                payment_intent
                payment_method
                start_date
                status
                stripe_subscription_id
                subscription_id
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: { getPaymentHistoryInput },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.getPaymentHistoryByCompanyId?.status === "SUCCESS") {
      return response?.data?.getPaymentHistoryByCompanyId?.data;
    } else if (
      response?.data?.getPaymentHistoryByCompanyId?.status === "ERROR"
    ) {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}
export async function refreshBillingReceiptUrl(
  transactionId: string
): Promise<{
  hosted_invoice_url?: string | null;
  invoice_pdf?: string | null;
  invoice_number?: string | null;
} | null> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query RefreshBillingReceiptUrl($transactionId: String!) {
          refreshBillingReceiptUrl(transaction_id: $transactionId) {
            status
            message
            data {
              hosted_invoice_url
              invoice_pdf
              invoice_id
              invoice_number
            }
          }
        }
      `,
      variables: { transactionId },
      fetchPolicy: "no-cache",
    });
    const payload = response?.data?.refreshBillingReceiptUrl;
    if (payload?.status === "SUCCESS") {
      return payload?.data || null;
    }
    if (payload?.message) {
      showErrorToast(payload.message);
    }
    return null;
  } catch (error: any) {
    return null;
  }
}

export const cancelSubscriptionForUser = async (data: any): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation CancelSubscriptionForUser(
          $companyId: Float!
          $cancellationReason: String
        ) {
          cancelSubscriptionForUser(
            company_id: $companyId
            cancellation_reason: $cancellationReason
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
      variables: {
        companyId: data.companyId,
      },
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.cancelSubscriptionForUser?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.cancelSubscriptionForUser?.message);
      return true;
    }
    if (
      response?.data?.cancelSubscriptionForUser?.status === ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.cancelSubscriptionForUser?.message);
      return false;
    }
    return false;
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);

    return null;
  }
};

export async function updateDelegatePowers(payload: any): Promise<any> {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation UpdateDelegatePowers($payload: UpdateDelegatePowersInput!) {
          updateDelegatePowers(payload: $payload) {
            message
            status
          }
        }
      `,
      variables: { payload },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.updateDelegatePowers?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.updateDelegatePowers?.message);
      return true;
    } else {
      return null;
    }
  } catch (error: any) {
    return false;
  }
}

export async function ValidateCouponService(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query ValidateCoupon($coupon: String!, $companyId: Float) {
          validateCoupon(coupon: $coupon, company_id: $companyId) {
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
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.validateCoupon?.status === ApiResponse.SUCCESS) {
      return response?.data?.validateCoupon?.data; // Return coupon data
    } else {
      showErrorToast(response?.data?.validateCoupon?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error?.message || error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
}
