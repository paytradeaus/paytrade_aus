import { gql } from "@apollo/client";
import { toast } from "@/app/Toaster";
import { client } from "@/app/api/adminAPIs/adminAPIs";

export interface LedgerType {
  entries: any;
  date: any;
  account_name: string;
  activity_id: number;
  balance_amount: number;
  bank_account_id: number;
  beneficiary_type: string;
  contract_id: number;
  credit_amount: number;
  debit_amount: number;
  journal_date: any;
  journal_description: string;
  journal_number: string;
  journal_system_ref: number;
  project_id: number;
  supplier_id: number;
  transaction_account_id: number;
  net_movement: number;
  total_credit_amount: number;
  total_debit_amount: number;
  credit_net_movement: number;
  debit_net_movement: number;
}

export const getLedgerServices = async (
  data: any,
  setLoading?: Function
): Promise<{ total_count: number; grid_entries: LedgerType[] } | any> => {
  try {
    const response = await client.query({
      query: gql`
        query FetchAccountLedgerByAccountId(
          $payload: FetchAccountLedgerByAccountIdInput!
        ) {
          fetchAccountLedgerByAccountId(payload: $payload) {
            data {
              grid_entries {
                account_name
                entries {
                  account_name
                  activity_id
                  balance_amount
                  bank_account_id
                  beneficiary_type
                  company_id
                  contract_id
                  credit_amount
                  debit_amount
                  id
                  journal_date
                  journal_description
                  journal_number
                  journal_system_ref
                  project_id
                  supplier_id
                  transaction_account_id
                }
                net_movement
                total_credit_amount
                total_debit_amount
                opening_balance
                credit_net_movement
                debit_net_movement
              }
              total_count
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
          page_number: data?.page_number,
          // page_size: data?.page_size,
          start_date: data?.start_date,
          end_date: data?.end_date,
          timezone: data?.timezone,
        },
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.fetchAccountLedgerByAccountId?.status === "SUCCESS") {
      return response?.data?.fetchAccountLedgerByAccountId?.data;
    }
    if (response?.data?.fetchAccountLedgerByAccountId?.status === "ERROR") {
      return null;
    }
  } catch (error: any) {
    toast.error(error.message || "Something went wrong in the API");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
