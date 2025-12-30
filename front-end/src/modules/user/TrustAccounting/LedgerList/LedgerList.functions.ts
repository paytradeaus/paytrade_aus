import { ERROR, SUCCESS } from "@/app/message";
import { showErrorToast } from "@/components/Toaster";
import apolloClient from "@/network/apolloClient";
import { gql } from "@apollo/client";
import { format } from "date-fns";

interface HeaderBase {
  value: string;
  label: string;
}

interface MergedHeader extends HeaderBase {
  colspan: number;
  align: string;
}

type Header = {
  value: string;
  label: string;
  colspan?: number;
  align?: string;
};
export interface LedgerType {
  entries: any;
  date: any;
  account_name: string;
  account_type: string;
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
    const response = await apolloClient.query({
      query: gql`
        query FetchAccountLedgerByAccountId(
          $payload: FetchAccountLedgerByAccountIdInput!
        ) {
          fetchAccountLedgerByAccountId(payload: $payload) {
            data {
              filter_dates {
                end_date
                start_date
              }
              grid_entries {
                account_name
                credit_net_movement
                debit_net_movement
                entries {
                  account_name
                  audit_id
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
                  journal_number_format
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
                }
                net_movement
                opening_balance
                total_credit_amount
                total_debit_amount
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
          start_date: format(new Date(data?.start_date), "yyyy-MM-dd"),
          end_date: format(new Date(data?.end_date), "yyyy-MM-dd"),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          beneficiary: data?.beneficiary || null,
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
    showErrorToast(error.message || "Something went wrong in the API");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const getBeneficiaryList = async (
  data: any,
  setLoading?: Function
): Promise<{ total_count: number; grid_entries: LedgerType[] } | any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchAccountLedgerByAccountId(
          $payload: FetchAccountLedgerByAccountIdInput!
        ) {
          fetchAccountLedgerByAccountId(payload: $payload) {
            data {
              beneficiary_list
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
          start_date: format(new Date(data?.start_date), "yyyy-MM-dd"),
          end_date: format(new Date(data?.end_date), "yyyy-MM-dd"),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
    showErrorToast(error.message || "Something went wrong in the API");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
