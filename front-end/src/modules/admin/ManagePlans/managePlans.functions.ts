import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";

import { gql } from "@apollo/client";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";

async function FetchAllBankAccounts(data: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchAllBankAccounts($payload: FetchAllBankAccountsInput!) {
          fetchAllBankAccounts(payload: $payload) {
            data {
              extendedBankAccounts {
                account_name
                account_number
                account_type
                bank_account_id
                bsb_number
                created_on
                current_balance
                last_updated_days
                last_updated_type
                opening_date
                previous_status
                projects_count
                remaining_days
                status
                unmatched_transactions_count
                formatted_bank_account_balance
                updated_on
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
      response?.data?.fetchAllBankAccounts?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.fetchAllBankAccounts?.data;
    } else if (
      response &&
      response?.data?.fetchAllBankAccounts?.status === ApiResponse.ERROR
    ) {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

async function AdminArchiveSubscription(data: any): Promise<any> {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation AdminArchiveSubscriptionAndPricing($id: String!) {
          adminArchiveSubscriptionAndPricing(id: $id) {
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
      response?.data?.adminArchiveSubscriptionAndPricing?.status ===
      ApiResponse.SUCCESS
    ) {
      showSuccessToast(
        response?.data?.adminArchiveSubscriptionAndPricing?.message
      );
      return true;
    }
    if (
      response?.data?.adminArchiveSubscriptionAndPricing?.status ===
      ApiResponse.ERROR
    ) {
      showErrorToast(
        response?.data?.adminArchiveSubscriptionAndPricing?.message
      );
      return false;
    }
  } catch (error: any) {
    return false;
  }
}

export { FetchAllBankAccounts, AdminArchiveSubscription };
