import { gql } from "@apollo/client";
import { client } from "@/app/api/apolloClientServices";
import {
  ERROR,
  SOMETHING_WENT_WRONG,
  SUCCESS,
} from "@/common/constants/messages";
import { toast } from "@/app/Toaster";

export interface AccountDetails {
  account_name: string;
  account_type: string;
  bank_account_id: number;
  company_id: number;
  company_name: string;
  delegated_date: string | null;
  delegation: string;
}

export const ListAllDelegatedAccounts = async (
  data: any,
  setLoading?: Function
): Promise<{ account_list: AccountDetails[]; total_count: number } | any> => {
  try {
    const response = await client.query({
      query: gql`
        query ListAllDelegatedAccounts($payload: ListAllDelegatesInput!) {
          listAllDelegatedAccounts(payload: $payload) {
            data {
              account_list {
                account_name
                account_type
                bank_account_id
                company_id
                company_name
                delegated_date
                delegation
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: {
        payload: data,
      },
      fetchPolicy: "no-cache",
    });
    if (
      response &&
      response?.data?.listAllDelegatedAccounts?.status === SUCCESS
    ) {
      return response?.data?.listAllDelegatedAccounts?.data;
    }
    if (
      response &&
      response?.data?.listAllDelegatedAccounts?.status === ERROR
    ) {
      console.error(
        response && response?.data?.listAllDelegatedAccounts?.message
      );
      return null;
    }
  } catch (error: any) {
    toast.error(error?.message || SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
