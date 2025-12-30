import { showErrorToast } from "@/components/Toaster";
import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

export async function AdminListSubscriptionItems(data: any): Promise<any> {
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
      variables: data,
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
}

export const editSubscriptionDetails = async (data: any): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation AdminUpdateSubsciptionItem(
          $updateSubscriptionItemInput: UpdateSubscriptionItemInput!
        ) {
          adminUpdateSubsciptionItem(
            updateSubscriptionItemInput: $updateSubscriptionItemInput
          ) {
            data {
              description
              dropdown_type
              id
              item_name
              item_status
              limit_type
              unit_type
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
      response?.data?.adminUpdateSubsciptionItem?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.adminUpdateSubsciptionItem?.data;
    }
    if (
      response?.data?.adminUpdateSubsciptionItem?.status === ApiResponse.ERROR
    ) {
      console.error(response?.data);
      return false;
    }
    return false;
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);

    return false;
  }
};
