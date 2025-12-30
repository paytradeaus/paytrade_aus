import { gql } from "@apollo/client";
import { toast } from "@/app/Toaster";
import { client } from "@/app/api/adminAPIs/adminAPIs";

const SUCCESS = "SUCCESS"; // Define these constants as per your application's response handling
const ERROR = "ERROR";

export interface BankAccountData {
  account_name: string;
  account_type: string;
  balance_check: string;
  bank_account_id: string;
  closing_balance: number;
  company_id: string;
  company_name: string;
  id: string;
  status: string;
}

export const fetchBankAccountsForJournals = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    setLoading && setLoading(true);

    const response = await client.query({
      query: gql`
        query GetAllBankAccountsForJournals(
          $payload: GetAllBankAccountsForJournalsInput!
        ) {
          getAllBankAccountsForJournals(payload: $payload) {
            data {
              account_list {
                account_name
                account_type
                balance_check
                bank_account_id
                closing_balance
                company_id
                company_name
                id
                status
                primary_admin_id
                primary_admin_name
                primary_admin_email
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: { payload: data },
      fetchPolicy: "no-cache",
    });

    if (
      response &&
      response.data.getAllBankAccountsForJournals.status === SUCCESS
    ) {
      return response.data.getAllBankAccountsForJournals.data;
    }
    if (
      response &&
      response.data.getAllBankAccountsForJournals.status === ERROR
    ) {
      toast.error(response.data.getAllBankAccountsForJournals.message);
      return null;
    }
  } catch (error: any) {
    console.error("Error fetching bank accounts for journals:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export interface FilterData {
  account_list: { name: string; value: string }[];
  account_type_list: { name: string; value: string }[];
  company_list: { name: string; value: string }[];
}

export const fetchFiltersForAdminJournals = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    setLoading && setLoading(true);

    const response = await client.query({
      query: gql`
        query GetFiltersForAdmin {
          getFiltersForAdmin {
            data {
              account_list {
                name
                value
              }
              account_type_list {
                name
                value
              }
              company_list {
                name
                value
              }
            }
            message
            status
          }
        }
      `,
      variables: { payload: data },
      fetchPolicy: "no-cache",
    });

    if (response && response.data.getFiltersForAdmin.status === "SUCCESS") {
      return response.data.getFiltersForAdmin.data;
    }
    if (response && response.data.getFiltersForAdmin.status === "ERROR") {
      toast.error(response.data.getFiltersForAdmin.message);
      return null;
    }
  } catch (error: any) {
    console.error("Error fetching filters for admin journals:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const fetchFiltersForAdminTrustAccounting = async (
  payload: any,
  setLoading?: Function
): Promise<any> => {
  try {
    setLoading && setLoading(true);

    const response = await client.query({
      query: gql`
        query FetchFiltersForAdminTrustAccounting(
          $payload: FetchFiltersForTrustAccountingInput!
        ) {
          fetchFiltersForAdminTrustAccounting(payload: $payload) {
            data {
              company_list {
                name
                value
              }
              account_list {
                account_type
                name
                opening_date
                value
              }
              account_type_list {
                name
                value
              }
            }
            message
            status
          }
        }
      `,
      variables: { payload },
      fetchPolicy: "no-cache",
    });

    if (
      response &&
      response.data.fetchFiltersForAdminTrustAccounting.status === "SUCCESS"
    ) {
      return response.data.fetchFiltersForAdminTrustAccounting.data;
    }

    if (
      response &&
      response.data.fetchFiltersForAdminTrustAccounting.status === "ERROR"
    ) {
      toast.error(response.data.fetchFiltersForAdminTrustAccounting.message);
      return null;
    }
  } catch (error: any) {
    console.error("Error fetching filters for admin trust accounting:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
