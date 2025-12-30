import { gql } from "@apollo/client";
import { toast } from "@/app/Toaster";
import { client } from "@/app/api/adminAPIs/adminAPIs";

export interface CheckReportExistenceInput {
  bank_account_id: number;
  month_end_date: any;
  timezone: string;
}

export const checkReportExistence = async (
  data: CheckReportExistenceInput,
  setLoading?: Function
): Promise<any> => {
  try {
    setLoading && setLoading(true);

    const response = await client.query({
      query: gql`
        query CheckReportExistence(
          $payload: CheckReportExistenceByAccountIdInput!
        ) {
          checkReportExistence(payload: $payload) {
            message
            status
            data
          }
        }
      `,
      variables: { payload: data },
      fetchPolicy: "no-cache",
    });

    if (response && response.data.checkReportExistence.status === "SUCCESS") {
      return response.data.checkReportExistence.data;
    }
    if (response && response.data.checkReportExistence.status === "ERROR") {
      console.error(response.data.checkReportExistence.message);
      return null;
    }
  } catch (error: any) {
    console.error("Error checking report existence:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
export interface CheckAndGetStatementBalanceInput {
  bank_account_id: number;
  month_end_date: any;
  timezone: string;
}

export interface StatementBalanceResponse {
  data: {
    checkAndGetStatementBalance: {
      data: {
        name: number;
        value: string;
      };
      message: string;
      status: string;
    };
  };
}

export const checkAndGetStatementBalance = async (
  data: CheckAndGetStatementBalanceInput,
  setLoading?: Function
): Promise<any> => {
  try {
    setLoading && setLoading(true);

    const response = await client.query({
      query: gql`
        query CheckAndGetStatementBalance(
          $payload: CheckReportExistenceByAccountIdInput!
        ) {
          checkAndGetStatementBalance(payload: $payload) {
            data {
              name
              value
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
      response.data.checkAndGetStatementBalance.status === "SUCCESS"
    ) {
      return response.data;
    }
    if (
      response &&
      response.data.checkAndGetStatementBalance.status === "ERROR"
    ) {
      console.error(response.data.checkAndGetStatementBalance.message);
      return null;
    }
  } catch (error: any) {
    console.error("Error checking and getting statement balance:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export interface GetTrustAccountingBalanceInput {
  bank_account_id: number;
  month_end_date: any;
  timezone: string;
}

export interface TrustAccountingBalanceResponse {
  data: {
    getTrustAccountingBalanceByAccountId: {
      data: {
        formatted_account_ledger_balance: string | null;
        formatted_deposit_and_withdrawal_balance: string | null;
        unformatted_account_ledger_balance: string | null;
        unformatted_deposit_and_withdrawal_balance: string | null;
      };
      message: string;
      status: string;
    };
  };
}

export const getTrustAccountingBalanceByAccountId = async (
  data: GetTrustAccountingBalanceInput,
  setLoading?: Function
): Promise<any> => {
  try {
    setLoading && setLoading(true);

    const response = await client.query({
      query: gql`
        query GetTrustAccountingBalanceByAccountId(
          $payload: GetTrustAccountingBalanceInput!
        ) {
          getTrustAccountingBalanceByAccountId(payload: $payload) {
            data {
              formatted_account_ledger_balance
              formatted_deposit_and_withdrawal_balance
              unformatted_account_ledger_balance
              unformatted_deposit_and_withdrawal_balance
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
      response.data.getTrustAccountingBalanceByAccountId.status === "SUCCESS"
    ) {
      return response.data;
    }

    if (
      response &&
      response.data.getTrustAccountingBalanceByAccountId.status === "ERROR"
    ) {
      console.error(response.data.getTrustAccountingBalanceByAccountId.message);
      return null;
    }
  } catch (error: any) {
    console.error("Error fetching trust accounting balance:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const insertReconciliationReportDetails = async (payload: {
  company_id: number;
  bank_account_id: number;
  month_end_date: string;
  bank_statement_balance: number;
  adjustments: number;
  adjustment_comment: string;
  expected_balance: number;
  deposit_withdrawal_balance: number;
  account_ledger_balance: number;
  reconcile_status: string;
}): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation InsertReconciliationReportDetails(
          $payload: AddReconciliationReportInput!
        ) {
          insertReconciliationReportDetails(payload: $payload) {
            data {
              company_id
              id
              report_id
              report_status
            }
            message
            status
          }
        }
      `,
      variables: {
        payload,
      },
    });

    // Handle the response as needed
    if (
      response?.data?.insertReconciliationReportDetails?.status === "SUCCESS"
    ) {
      toast.success(response?.data?.insertReconciliationReportDetails?.message);
      return response?.data?.insertReconciliationReportDetails?.data;
    } else if (
      response?.data?.insertReconciliationReportDetails?.status === "ERROR"
    ) {
      toast.error(response?.data?.insertReconciliationReportDetails?.message);
      return null;
    }
    // Return null if no status is found
    return null;
  } catch (error) {
    // Handle errors
    console.error("Error in insertReconciliationReportDetails:", error);
    console.error("Payload:", payload);
    throw error;
  }
};

export const viewReconciliationReportById = async (
  data: { id: string },
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query ViewReconciliationReportById($id: String!) {
          viewReconciliationReportById(id: $id) {
            data {
              account_ledger_balance
              adjustment_comment
              adjustments
              bank_account_id
              account_name
              bank_statement_balance
              company_id
              deposit_withdrawal_balance
              expected_balance
              id
              month_end_date
              reconcile_status
              report_id
              report_status
            }
            message
            status
          }
        }
      `,
      variables: {
        ...data,
      },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.viewReconciliationReportById?.status === "SUCCESS") {
      return response?.data?.viewReconciliationReportById?.data;
    }

    if (response?.data?.viewReconciliationReportById?.status === "ERROR") {
      return null;
    }

    return null;
  } catch (error: any) {
    toast.error(error.message || "Something went wrong in API");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export interface EditReconciliationReportInput {
  id: any;
  company_id: any;
  bank_account_id: any;
  month_end_date: any;
  bank_statement_balance: number;
  adjustments: number;
  adjustment_comment: string;
  expected_balance: number;
  deposit_withdrawal_balance: number;
  account_ledger_balance: number;
  reconcile_status: string;
}

export const editReconciliationReportDetails = async (
  payload: EditReconciliationReportInput,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation EditReconciliationReportDetails(
          $payload: EditReconciliationReportInput!
        ) {
          editReconciliationReportDetails(payload: $payload) {
            data {
              company_id
              id
              report_id
              report_status
            }
            message
            status
          }
        }
      `,
      variables: {
        payload: {
          id: payload.id,
          company_id: payload.company_id,
          bank_account_id: payload.bank_account_id,
          month_end_date: payload.month_end_date,
          bank_statement_balance: payload.bank_statement_balance,
          adjustments: payload.adjustments,
          adjustment_comment: payload.adjustment_comment,
          expected_balance: payload.expected_balance,
          deposit_withdrawal_balance: payload.deposit_withdrawal_balance,
          account_ledger_balance: payload.account_ledger_balance,
          reconcile_status: payload.reconcile_status,
        },
      },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.editReconciliationReportDetails?.status === "SUCCESS") {
      toast.success(response?.data?.editReconciliationReportDetails?.message);
      return true;
    }
    if (response?.data?.editReconciliationReportDetails?.status === "ERROR") {
      toast.error(response?.data?.editReconciliationReportDetails?.message);
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
