import { client } from "@/app/api/apolloClientServices";
import { toast } from "@/app/Toaster";
import { gql } from "@apollo/client";

export interface CancelSubscriptionInput {
  companyId: number | any;
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
