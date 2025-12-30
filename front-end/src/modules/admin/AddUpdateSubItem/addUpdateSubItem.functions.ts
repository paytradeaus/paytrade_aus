import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

export async function checkSubscriptionItemNameExistence(
  itemName: string,
  token?: string
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query CheckSubscriptionItemNameExistence($itemName: String!) {
          checkSubscriptionItemNameExistence(item_name: $itemName) {
            data {
              description
              id
              item_name
              item_status
            }
            message
            status
          }
        }
      `,
      variables: {
        itemName,
      },
      context: {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      },
    });

    return response.data.checkSubscriptionItemNameExistence?.data;
  } catch (error: any) {
    return [];
  }
}

export async function AdminAddSubscriptionItem(data: any): Promise<any> {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation AdminAddSubsciptionItem(
          $addSubscriptionItemInput: AddSubscriptionItemInput!
        ) {
          adminAddSubsciptionItem(
            addSubscriptionItemInput: $addSubscriptionItemInput
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
      response?.data?.adminAddSubsciptionItem?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast("Subscription item added successfully");
      return true;
    }
    if (response?.data?.adminAddSubsciptionItem?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.adminAddSubsciptionItem?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error);

    return false;
  }
}

export async function AdminGetSubscriptionItemById(data: {
  id: any;
}): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query AdminGetSubsciptionItemById(
          $adminGetSubsciptionItemByIdId: String!
        ) {
          adminGetSubsciptionItemById(id: $adminGetSubsciptionItemByIdId) {
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
      variables: {
        adminGetSubsciptionItemByIdId: data.id,
      },
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.adminGetSubsciptionItemById?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.adminGetSubsciptionItemById?.data;
    }

    if (
      response?.data?.adminGetSubsciptionItemById?.status === ApiResponse.ERROR
    ) {
      showErrorToast(
        response.data.adminGetSubsciptionItemById.message ||
          "Failed to fetch subscription item"
      );
      return null;
    }

    return null;
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);

    return null;
  }
}
