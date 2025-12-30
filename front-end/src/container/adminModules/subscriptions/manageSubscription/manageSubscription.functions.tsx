import { toast } from "@/app/Toaster";
import { client } from "@/app/api/apolloClientServices";
import { gql } from "@apollo/client";
import { ERROR, SUCCESS } from "@/common/constants/messages";

export interface SubscribedUser {
  bill_cycle: string;
  canceled_at: string | null;
  company_email_id: string;
  company_id: string;
  company_name: string;
  expiry_date: string;
  id: string;
  payment_method_id: string;
  plan_id: string;
  plan_name: string;
  plan_price: number;
  plan_status: string;
  price_id: string;
  start_date: string;
  stripe_customer_id: string;
  stripe_price_id: string;
  subscribed_amount: number | any;
  subscription_id: string;
  subscription_status: string;
  trial_end: string;
  trial_period: number;
  trial_start: string;
  unformatted_subscribed_amount: number;
  description?: string;
  item_status?: string;
  item_name?: string;
}

export const AdminListSubscribedUsers = async (
  data: any,
  setLoading?: Function
): Promise<{ userList: SubscribedUser[]; totalCount: number } | any> => {
  try {
    const response = await client.query({
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
      response?.data?.getAllSubscribedUsersList?.status === SUCCESS
    ) {
      return response?.data?.getAllSubscribedUsersList?.data;
    }
    if (
      response &&
      response?.data?.getAllSubscribedUsersList?.status === ERROR
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

export const CancelSubscriptionForUser = async (
  companyId: number
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
      variables: { companyId },
      // fetchPolicy: "no-cache", // Uncomment if you need to disable cache
    });

    const result = response?.data?.cancelSubscriptionForUser;

    if (result?.status === SUCCESS) {
      toast.success(result?.message);
      return true;
    }

    if (result?.status === ERROR) {
      toast.error(result?.message);
      return false;
    }
  } catch (error) {
    toast.error("An error occurred while canceling the subscription.");
    return false;
  }
};
