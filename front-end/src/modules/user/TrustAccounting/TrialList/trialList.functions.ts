import { ERROR, SUCCESS } from "@/app/message";
import { showErrorToast } from "@/components/Toaster";
import apolloClient from "@/network/apolloClient";
import { gql } from "@apollo/client";
import { format } from "date-fns";

export interface LedgerTrialBalanceType {
  account_name: string;
  beneficiary_type: string;
  closing_balance: number;
  transaction_account_id: number;
}

export const getLedgerTrialBalanceServices = async (
  data: any,
  setLoading?: Function
): Promise<
  | {
      total_closing_balance: number;
      trial_balance_list: LedgerTrialBalanceType[];
    }
  | any
> => {
  try {
    setLoading && setLoading(true);

    const response = await apolloClient.query({
      query: gql`
        query FetchLedgerTrialBalanceByAccountId(
          $payload: FetchLedgerTrialBalanceByAccountIdInput!
        ) {
          fetchLedgerTrialBalanceByAccountId(payload: $payload) {
            data {
              total_closing_balance
              trial_balance_list {
                account_name
                beneficiary_type
                closing_balance
                transaction_account_id
              }
            }
            message
            status
          }
        }
      `,
      variables: {
        payload: {
          bank_account_id: data?.bank_account_id,
          date_filter: data?.date_filter,
          start_date: data?.start_date,
          timezone: data?.timezone,
        },
      },
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.fetchLedgerTrialBalanceByAccountId?.status === "SUCCESS"
    ) {
      return response?.data?.fetchLedgerTrialBalanceByAccountId?.data;
    }

    if (
      response?.data?.fetchLedgerTrialBalanceByAccountId?.status === "ERROR"
    ) {
      showErrorToast(
        response?.data?.fetchLedgerTrialBalanceByAccountId?.message ||
          "Error fetching ledger trial balance"
      );
      return null;
    }
  } catch (error: any) {
    showErrorToast(error.message || "Something went wrong in the API");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
