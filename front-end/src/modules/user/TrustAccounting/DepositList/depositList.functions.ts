import { ERROR, SUCCESS } from "@/app/message";
import { showErrorToast } from "@/components/Toaster";
import apolloClient from "@/network/apolloClient";
import { gql } from "@apollo/client";
import { format } from "date-fns";

export interface GridEntryType {
  account_name: string;
  activity_id: number;
  amount: number;
  balance_amount: number;
  bsb_number: number;
  account_number: number;
  bank_account_id: number;
  beneficiary_type: string;
  grid_entries: any;
  company_id: number;
  contract_id: number;
  id: number;
  journal_date: string;
  journal_description: string;
  journal_number: string;
  journal_system_ref: string;
  project_id: number;
  supplier_id: number;
  transaction_account_id: number;
  type: string;
}

export interface DepositsAndWithdrawalsType {
  closing_balance: number;
  grid_entries: GridEntryType[];
  opening_balance: number;
}

export const getDepositsAndWithdrawalsByAccountId = async (
  data: any,
  setLoading?: Function
): Promise<
  | {
      closing_balance: number;
      grid_entries: GridEntryType[];
      opening_balance: number;
    }
  | any
> => {
  try {
    setLoading && setLoading(true);

    const response = await apolloClient.query({
      query: gql`
        query FetchDepositsAndWithdrawalsByAccountId(
          $payload: FetchDepositsAndWithdrawalsByAccountIdInput!
        ) {
          fetchDepositsAndWithdrawalsByAccountId(payload: $payload) {
            data {
              filter_dates {
                end_date
                start_date
              }
              closing_balance
              closing_date
              grid_entries {
                account_name
                account_number
                amount
                audit_id
                balance_amount
                bank_account_id
                beneficiary_type
                bsb_number
                company_id
                contract_id
                id
                journal_date
                journal_description
                journal_number
                journal_system_ref
                project_id
                route {
                  beneficiary_type
                  cash_retention_type
                  claim_type
                  payment_claim_id
                  payment_id
                  payment_list
                  retention_id
                  route_to
                }
                supplier_id
                transaction_account_id
                type
              }
              opening_balance
              opening_date
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
          end_date: data?.end_date,
          timezone: data?.timezone,
        },
      },
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.fetchDepositsAndWithdrawalsByAccountId?.status ===
      "SUCCESS"
    ) {
      return response?.data?.fetchDepositsAndWithdrawalsByAccountId?.data;
    }

    if (
      response?.data?.fetchDepositsAndWithdrawalsByAccountId?.status === "ERROR"
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
