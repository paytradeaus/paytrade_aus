import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

export async function AdminListSubscribedUsers(data: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetAllSubscribedUsersList(
          $getAllSubscribedUsersInput: GetAllSubscribedUsersInput!
        ) {
          getAllSubscribedUsersList(
            getAllSubscribedUsersInput: $getAllSubscribedUsersInput
          ) {
            data {
              total_count
              user_list {
                bill_cycle
                canceled_at
                company_email_id
                company_id
                company_name
                expiry_date
                id
                payment_method_id
                plan_id
                plan_name
                plan_price
                plan_status
                price_id
                start_date
                stripe_customer_id
                stripe_price_id
                subscribed_amount
                subscription_id
                subscription_status
                trial_end
                trial_period
                monthly_ai_credit
                trial_start
                unformatted_subscribed_amount
              }
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
      response?.data?.getAllSubscribedUsersList?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.getAllSubscribedUsersList?.data;
    }
    if (
      response &&
      response?.data?.getAllSubscribedUsersList?.status === ApiResponse.ERROR
    ) {
      return null;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return [];
  }
}

export async function CancelSubscriptionForUser(companyId: number) {
  try {
    const response = await apolloClient.mutate({
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
      variables: { companyId },
      // fetchPolicy: "no-cache", // Uncomment if you need to disable cache
    });

    const result = response?.data?.cancelSubscriptionForUser;

    if (result?.status === ApiResponse.SUCCESS) {
      showSuccessToast(result?.message);
      return true;
    }

    if (result?.status === ApiResponse.ERROR) {
      showErrorToast(result?.message);
      return false;
    }
  } catch (error) {
    return false;
  }
}
