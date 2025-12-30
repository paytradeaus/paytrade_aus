import { client } from "@/app/api/apolloClientServices";
import {
  ERROR,
  SOMETHING_WENT_WRONG,
  SUCCESS,
} from "@/common/constants/messages";
import {
  IBankTrustAccountDetails,
  ITransactions,
} from "./bankTrustAccount.types";
import { gql } from "@apollo/client";
import { toast } from "@/app/Toaster";

export const FetchAllBankAccounts = async (
  data: any,
  setLoading?: Function
): Promise<
  { admins: IBankTrustAccountDetails[]; totalCount: number } | any
> => {
  try {
    const response = await client.query({
      query: gql`
        query FetchAllBankAccounts($payload: FetchAllBankAccountsInput!) {
          fetchAllBankAccounts(payload: $payload) {
            data {
              extendedBankAccounts {
                account_name
                account_number
                account_type
                bank_account_id
                bsb_number
                created_on
                current_balance
                last_updated_days
                last_updated_type
                opening_date
                previous_status
                projects_count
                remaining_days
                status
                unmatched_transactions_count
                formatted_bank_account_balance
                updated_on
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

    if (response && response?.data?.fetchAllBankAccounts?.status === SUCCESS) {
      return response?.data?.fetchAllBankAccounts?.data;
    }
    if (response && response?.data?.fetchAllBankAccounts?.status === ERROR) {
      console.error(response && response?.data?.fetchAllBankAccounts?.message);
      return null;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const AddBankAccount = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation AddBankAccount($payload: AddBankAccountInput!) {
          addBankAccount(payload: $payload) {
            data {
              bank_account_id
            }
            message
            status
          }
        }
      `,
      variables: {
        payload: data,
      },
    });

    if (response?.data?.addBankAccount?.status === SUCCESS) {
      toast.success(successMsg || " This bank account has been added.");
      return response?.data?.addBankAccount?.data?.bank_account_id;
    }
    if (response?.data?.addBankAccount?.status === ERROR) {
      toast.error(response?.data?.addBankAccount?.message);
      return false;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};

export const FetchBankAccountDetails = async (
  data: any,
  setLoading?: Function
): Promise<
  { admins: IBankTrustAccountDetails[]; totalCount: number } | any
> => {
  try {
    const response = await client.query({
      query: gql`
        query FetchBankAccountDetails($payload: FetchBankAccountDetailsInput!) {
          fetchBankAccountDetails(payload: $payload) {
            data {
              account_name
              account_number
              account_type
              bank_account_id
              bsb_number
              created_on
              current_balance
              financial_institution
              interest_charges_sum
              last_updated_type
              opening_date
              previous_status
              status
              updated_on
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
      response?.data?.fetchBankAccountDetails?.status === SUCCESS
    ) {
      return response?.data?.fetchBankAccountDetails?.data;
    }
    if (response && response?.data?.fetchBankAccountDetails?.status === ERROR) {
      console.error(
        response && response?.data?.fetchBankAccountDetails?.message
      );
      return null;
    }
  } catch (error: any) {
    // toast.error(error?.message || SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const FetchBankAccountDetailsForEditing = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query FetchBankAccountDetailsForEditing(
          $payload: FetchBankAccountDetailsInput!
        ) {
          fetchBankAccountDetailsForEditing(payload: $payload) {
            data {
              account_name
              account_number
              account_type
              associated_cash_account_id
              bank_account_id
              bsb_number
              client_supplier_id
              contract_date
              contract_practical_completion_date
              contract_value
              delegate_powers
              financial_institution
              first_sub_contract_date
              opening_date
              previous_status
              project_ids
              retention_trust_certificate_attachment_ids
              status
              trustee_id
            }
            message
            status
          }
        }
      `,
      variables: {
        payload: data,
      },
    });
    if (response?.data?.fetchBankAccountDetailsForEditing?.status === SUCCESS) {
      return response?.data?.fetchBankAccountDetailsForEditing?.data;
    }
    if (response?.data?.fetchBankAccountDetailsForEditing?.status === ERROR) {
      console.error(response?.data?.fetchBankAccountDetailsForEditing?.message);
      toast.error(response?.data?.fetchBankAccountDetailsForEditing?.message);
      return {};
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return {};
  } finally {
    setLoading && setLoading(false);
  }
};

export const EditDetailsOfABankAccount = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation EditDetailsOfABankAccount(
          $payload: EditDetailsOfABankAccountInput!
        ) {
          editDetailsOfABankAccount(payload: $payload) {
            data
            message
            status
          }
        }
      `,
      variables: {
        payload: data,
      },
    });
    if (response?.data?.editDetailsOfABankAccount?.status === SUCCESS) {
      toast.success(successMsg || "This bank account has been updated");
      return true;
    }
    if (response?.data?.editDetailsOfABankAccount?.status === ERROR) {
      console.error(response?.data?.editDetailsOfABankAccount?.message);
      toast.error(response?.data?.editDetailsOfABankAccount?.message);
      return false;
    }
  } catch (error: any) {
    toast.error(error.message || SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};

export const ChangeStatusOfBankAccount = async (
  data: any,
  // successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation ChangeStatusOfBankAccount(
          $payload: ChangeStatusOfBankAccountInput!
        ) {
          changeStatusOfBankAccount(payload: $payload) {
            data
            message
            status
          }
        }
      `,
      variables: {
        payload: data,
      },
    });

    if (response?.data?.changeStatusOfBankAccount?.status === SUCCESS) {
      toast.success(
        response?.data?.changeStatusOfBankAccount?.message ||
          " This bank account status has been Changed."
      );
      return true;
    }
    if (response?.data?.changeStatusOfBankAccount?.status === ERROR) {
      console.error(response?.data?.changeStatusOfBankAccount?.message);
      toast.error(response?.data?.changeStatusOfBankAccount?.message);
      return false;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};

export async function addBankAccount(data: any): Promise<any> {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation Mutation($payload: AddBankStatementInput!) {
          addBankStatement(payload: $payload) {
            data {
              bank_statement_id
            }
            message
            status
          }
        }
      `,
      variables: data,
    });

    if (response?.data?.addBankStatement?.status === SUCCESS) {
      toast.success("This bank statement has been saved.");
      return true;
    } else {
      toast.error(response?.data?.addBankStatement?.message);
      return false;
    }
  } catch (error: any) {
    toast.error(error?.message);
    return false;
  }
}

export const FetchAllBankStatements = async (data: any): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query Query($payload: FetchAllBankStatementsInput!) {
          fetchAllBankStatements(payload: $payload) {
            data {
              bank_statements {
                bank_account_id
                bank_statement_attachment_id
                bank_statement_id
                bank_statement_name
                company_id
                created_by
                created_on
                statement_date
                status
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.fetchAllBankStatements?.status === SUCCESS) {
      return response?.data?.fetchAllBankStatements?.data;
    } else {
      return null;
    }
  } catch (error: any) {
    return null;
  }
};

export const fetchBankStatementById = async (data: any): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query FetchBankStatementDetails(
          $payload: FetchBankStatementDetailsInput!
        ) {
          fetchBankStatementDetails(payload: $payload) {
            data {
              bank_account_id
              bank_statement_attachment_id
              bank_statement_balance
              bank_statement_id
              bank_statement_name
              company_id
              created_by
              created_on
              statement_date
              status
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.fetchBankStatementDetails?.status === SUCCESS) {
      return response?.data?.fetchBankStatementDetails?.data;
    } else {
      return null;
    }
  } catch (error: any) {
    return null;
  }
};

export const fetchBankStatementFile = async (data: any): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query ReadFileAttachmentsOrDocuments(
          $payload: ReadFileAttachmentsOrDocumentsInput!
        ) {
          readFileAttachmentsOrDocuments(payload: $payload) {
            data {
              attachment_type
              file
              file_name
              file_path
              file_type
              id
              name
              uploaded_on
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.readFileAttachmentsOrDocuments?.status === SUCCESS) {
      return response?.data?.readFileAttachmentsOrDocuments?.data;
    } else {
      return null;
    }
  } catch (error: any) {
    return null;
  }
};

export async function updateBankStatement(data: any): Promise<any> {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation EditDetailsOfABankStatement(
          $payload: EditDetailsOfABankStatementInput!
        ) {
          editDetailsOfABankStatement(payload: $payload) {
            data
            message
            status
          }
        }
      `,
      variables: data,
    });

    if (response?.data?.editDetailsOfABankStatement?.status === SUCCESS) {
      toast.success("This bank statement has been updated.");
      return true;
    } else {
      toast.error(response?.data?.editDetailsOfABankStatement?.message);
      return false;
    }
  } catch (error: any) {
    return false;
  }
}
export const fetchAllPayments = async (data: any): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query Data($payload: ListAllPaymentsInput!) {
          listAllPayments(payload: $payload) {
            data {
              payments {
                cash_retention
                cash_retention_type
                claim_amount
                claim_type
                client_supplier_id
                client_supplier_name
                client_supplier_type
                compulsory_attachment_ids
                contract_date
                contract_id
                contract_name
                due_date
                gst_summary
                is_paid_confirmed
                is_received_confirmed
                is_retention_confirmed
                matched_transactions
                memo
                optional_attachment_ids
                outstanding_amount
                payless_amount
                payment_amount
                payment_claim_id
                payment_date
                payment_from_account
                payment_from_account_name
                payment_id
                payment_overview_buttons
                payment_to_account
                payment_to_account_bsb_number
                payment_to_account_name
                payment_to_account_number
                payment_type
                project_date
                project_id
                project_name
                retention_account
                retention_account_name
                retention_account_number
                retention_amount
                retention_release_date
                status
                third_party_payment_reason
                total_amount
                list_status
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
    if (response && response?.data?.listAllPayments?.status === SUCCESS) {
      return response?.data?.listAllPayments?.data;
    }
    if (response && response?.data?.listAllPayments?.status === ERROR) {
      console.error(response && response?.data?.listAllPayments?.message);
      return null;
    }
  } catch (error: any) {
    // toast.error(error?.message || SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return null;
  }
};

export const DeletePayments = async (data: any): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation ChangeStatusOfAPayment(
          $payload: ChangeStatusOfAPaymentInput!
        ) {
          changeStatusOfAPayment(payload: $payload) {
            data
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
      response?.data?.changeStatusOfAPayment?.status === SUCCESS
    ) {
      toast.success("Payment has been Deleted.");
      return true;
    }
    if (response && response?.data?.changeStatusOfAPayment?.status === ERROR) {
      console.error(
        response && response?.data?.changeStatusOfAPayment?.message
      );
      return null;
    }
  } catch (error: any) {
    // toast.error(error?.message || SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return null;
  }
};

export const verifyBankStatementExistence = async (data: any): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query CheckExistenceOfBankStatement(
          $payload: CheckExistenceOfBankStatementInput!
        ) {
          checkExistenceOfBankStatement(payload: $payload) {
            data {
              isBankStatementAlreadyExists
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.checkExistenceOfBankStatement?.status === SUCCESS) {
      return response?.data?.checkExistenceOfBankStatement?.data;
    } else {
      return null;
    }
  } catch (error: any) {
    return null;
  }
};

export const FetchAllTransactions = async (
  data: any,
  setLoading?: Function
): Promise<
  { transactions_list: ITransactions[]; total_count: number } | any
> => {
  try {
    const response = await client.query({
      query: gql`
        query FetchAllTransactions($payload: FetchAllTransactionsInput!) {
          fetchAllTransactions(payload: $payload) {
            data {
              total_count
              transactions_list {
                description
                id
                matched_to
                received_amount
                spent_amount
                status
                txn_date
                bank_account_id
                is_receivable
              }
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
    if (response && response?.data?.fetchAllTransactions?.status === SUCCESS) {
      return response?.data?.fetchAllTransactions?.data;
    }
    if (response && response?.data?.fetchAllTransactions?.status === ERROR) {
      console.error(response && response?.data?.fetchAllTransactions?.message);
      return null;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const TriggerAccountNotices = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation TriggerAccountNotices($payload: triggerAccountNoticesInput!) {
          triggerAccountNotices(payload: $payload) {
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
    if (response?.data?.triggerAccountNotices?.status === "SUCCESS") {
      toast.success(response?.data?.triggerAccountNotices?.message);
      return true;
    }
    if (response?.data?.triggerAccountNotices?.status === "ERROR") {
      toast.error(response?.data?.triggerAccountNotices?.message);
      console.error(response?.data);
      return false;
    }
  } catch (error: any) {
    toast.error(error.message || "Something went wrong in API");
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};

export const DeleteTransactions = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation DeleteTransactions($transactionIds: [String!]!) {
          deleteTransactions(transaction_ids: $transactionIds) {
            message
            status
          }
        }
      `,
      variables: data,
    });
    if (response?.data?.deleteTransactions?.status === SUCCESS) {
      toast.success(
        response?.data?.deleteTransactions?.message ||
          "Deleted selected transactions"
      );
      return true;
    }
    if (response?.data?.deleteTransactions?.status === ERROR) {
      toast.error(response?.data?.deleteTransactions?.message);
      return false;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};

export const projectArraysCompare = (
  arr1: Array<number>,
  arr2: Array<number>
) => {
  if (arr1.length !== arr2.length) return true;

  const set1: any = new Set(arr1.map(String)); // Normalize to strings and use Set
  const set2 = new Set(arr2.map(String)); // Normalize to strings and use Set

  // Check if every element in set1 exists in set2
  for (const value of set1) {
    if (!set2.has(value)) return true;
  }

  return false;
};
