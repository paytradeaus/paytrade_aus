import { client } from "@/app/api/apolloClientServices";
import { SUCCESS } from "@/common/constants/messages";
import { gql } from "@apollo/client";

export async function fetchSubscriptionType(): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query AdminListSubscriptionPlans {
          adminListSubscriptionPlans {
            data {
              subscriptionPlans {
                actual_price
                bill_cycle
                description
                discounted_price
                id
                items {
                  subscriptionItems {
                    id
                    item_name
                    selected
                  }
                }
                period
                plan_name
                plan_type
                stripe_plan_id
                subscription_status
              }
              totalCount
            }
            message
            status
          }
        }
      `,
      variables: {},
      fetchPolicy: "no-cache",
    });

    if (response?.data?.adminListSubscriptionPlans?.status === SUCCESS) {
      return response?.data?.adminListSubscriptionPlans?.data
        ?.subscriptionPlans;
    } else {
      return {};
    }
  } catch (error: any) {
    return {};
  }
}
