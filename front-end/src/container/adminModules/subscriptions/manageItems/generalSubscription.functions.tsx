import { toast } from "@/app/Toaster";
import { client } from "@/app/api/apolloClientServices";
import { gql } from "@apollo/client";
import { ERROR, SUCCESS } from "@/common/constants/messages";

export interface SubscriptionItem {
  description: string;
  id: string;
  item_name: string;
  item_status: string;
}

export interface SubscriptionItemsResponse {
  subscriptionItems: SubscriptionItem[];
  totalCount: number;
}

export const AdminListSubscriptionItems = async (
  data: {
    status?: string | null;
    keyword?: string | null;
    page: number;
    perPage: number;
  },
  setLoading?: Function
): Promise<any> => {
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
      variables: data,
      fetchPolicy: "no-cache",
    });

    if (
      response &&
      response?.data?.adminListSubscriptionItems?.status === "SUCCESS"
    ) {
      return response?.data?.adminListSubscriptionItems?.data;
    }
    if (
      response &&
      response?.data?.adminListSubscriptionItems?.status === "ERROR"
    ) {
      return null;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
