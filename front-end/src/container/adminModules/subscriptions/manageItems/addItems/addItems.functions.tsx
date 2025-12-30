import { toast } from "@/app/Toaster";
import { client } from "@/app/api/apolloClientServices";
import { gql } from "@apollo/client";
import { ERROR, SUCCESS } from "@/common/constants/messages";

export const checkSubscriptionItemNameExistence = async (
  itemName: string,
  token?: string
): Promise<any> => {
  try {
    const response = await client.query({
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
    console.error("GraphQL Error:", error);
    return [];
  }
};

export const AdminAddSubsciptionItem = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation AdminAddSubsciptionItem(
          $addSubscriptionItemInput: AddSubscriptionItemInput!
        ) {
          adminAddSubsciptionItem(
            addSubscriptionItemInput: $addSubscriptionItemInput
          ) {
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
      variables: data,

      fetchPolicy: "no-cache",
    });
    if (response?.data?.adminAddSubsciptionItem?.status === SUCCESS) {
      toast.success("Subscription item added successfully");
      return true;
    }
    if (response?.data?.adminAddSubsciptionItem?.status === ERROR) {
      toast.error(response?.data?.adminAddSubsciptionItem?.message);
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

export const AdminGetSubsciptionItemById = async (
  data: { id: any },
  setLoading?: Function
): Promise<any> => {
  try {
    if (setLoading) setLoading(true);

    const response = await client.query({
      query: gql`
        query AdminGetSubsciptionItemById(
          $adminGetSubsciptionItemByIdId: String!
        ) {
          adminGetSubsciptionItemById(id: $adminGetSubsciptionItemByIdId) {
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
        adminGetSubsciptionItemByIdId: data.id,
      },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.adminGetSubsciptionItemById?.status === "SUCCESS") {
      return response?.data?.adminGetSubsciptionItemById?.data;
    }

    if (response?.data?.adminGetSubsciptionItemById?.status === "ERROR") {
      toast.error(
        response.data.adminGetSubsciptionItemById.message ||
          "Failed to fetch subscription item"
      );
      return null;
    }

    return null;
  } catch (error: any) {
    toast.error(error.message || "Something went wrong in API");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    if (setLoading) setLoading(false);
  }
};

export const editSubscriptionDetails = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation AdminUpdateSubsciptionItem(
          $updateSubscriptionItemInput: UpdateSubscriptionItemInput!
        ) {
          adminUpdateSubsciptionItem(
            updateSubscriptionItemInput: $updateSubscriptionItemInput
          ) {
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
      variables: data,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.adminUpdateSubsciptionItem?.status === "SUCCESS") {
      return response?.data?.adminUpdateSubsciptionItem?.data;
    }
    if (response?.data?.adminUpdateSubsciptionItem?.status === "ERROR") {
      console.error(response?.data);
      return false;
    }
    return false;
  } catch (error: any) {
    toast.error(error.message || "Something went wrong in API");
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};
