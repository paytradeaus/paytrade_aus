import { ERROR, SUCCESS } from "@/app/message";
import { showErrorToast } from "@/components/Toaster";
import apolloClient from "@/network/apolloClient";
import { gql } from "@apollo/client";
import { format } from "date-fns";

export interface LedgerJournalsType {
  audit_id: string;
  accounts: any;
  account_name: string;
  account_type: string;
  search: number;
  credit: number;
  debit: number;
  date: any;
  activity_id: number;
  description: string;
  journal_description: string;
  total_credit: number;
  total_debit: number;
  total_count: number;
}

interface HeaderBase {
  value: string;
  label: string;
}

interface MergedHeader extends HeaderBase {
  colspan: number;
  align: string;
}
interface GeneratePDFProps {
  data: any[];
  // headerNames: string[];
  dateText: string;
  fileName: string;
  autoPrint: boolean;
  columnStyles: { [key: number]: { halign: string } };
  p0: { headerBorder: boolean };
  headerText?: string; // Make headerText optional
}
type Header = {
  value: string;
  label: string;
  colspan?: number;
  align?: string;
};
export const getLedgerJournalServices = async (
  data: any,
  setLoading?: Function
): Promise<
  { total_count: number; ledger_journals_list: LedgerJournalsType[] } | any
> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchLedgerJournalsByAccountId(
          $payload: FetchLedgerJournalsByAccountIdInput!
        ) {
          fetchLedgerJournalsByAccountId(payload: $payload) {
            data {
              filter_dates {
                end_date
                start_date
              }
              ledger_journals_list {
                accounts {
                  audit_id
                  description
                  account_name
                  credit
                  debit
                }
                journal_number
                date
                journal_description
                total_credit
                total_debit
                route {
                  route_to
                  retention_id
                  payment_list
                  payment_id
                  payment_claim_id
                  claim_type
                  cash_retention_type
                  beneficiary_type
                }
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
          bank_account_id: data?.bank_account_id || null,
          date_filter: data?.date_filter,
          page_number: data?.page_number,
          //page_size: data?.page_size,
          search: data?.search,
          start_date: format(new Date(data?.start_date), "yyyy-MM-dd"),
          end_date: format(new Date(data?.end_date), "yyyy-MM-dd"),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.fetchLedgerJournalsByAccountId?.status === "SUCCESS") {
      return response?.data?.fetchLedgerJournalsByAccountId;
    }
    if (response?.data?.fetchLedgerJournalsByAccountId?.status === "ERROR") {
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
