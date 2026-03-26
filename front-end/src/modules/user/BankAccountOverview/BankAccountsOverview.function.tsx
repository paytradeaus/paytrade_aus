import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";
import { ITransactions } from "../BankAccounts/bankTrustAccount.types";

async function fetchBankAccountDetails(data: any) {
  try {
    const response = await apolloClient.query({
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
      response?.data?.fetchBankAccountDetails?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.fetchBankAccountDetails?.data;
    } else if (
      response &&
      response?.data?.fetchBankAccountDetails?.status === ApiResponse.ERROR
    ) {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

async function AdminlistAllFinancialInstitution(data: any) {
  try {
    const response = await apolloClient.query({
      query: gql`
        query AdminlistAllFinancialInstituion(
          $isAlphabeticalOrder: Boolean
          $keyword: String
          $page: Int
          $perPage: Int
          $status: String
        ) {
          adminlistAllFinancialInstituion(
            isAlphabeticalOrder: $isAlphabeticalOrder
            keyword: $keyword
            page: $page
            perPage: $perPage
            status: $status
          ) {
            data {
              institutions {
                acc_number_maxlength
                country
                created_on
                id
                institution_address
                institution_code
                institution_name
                institution_status
                latitude
                longitude
                place
                place_id
                region
              }
              totalCount
            }
            message
            status
          }
        }
      `,
      variables: data,
    });
    if (
      response &&
      response?.data?.adminlistAllFinancialInstituion?.status ===
        ApiResponse.SUCCESS
    ) {
      return response?.data?.adminlistAllFinancialInstituion?.data;
    }
    if (
      response &&
      response?.data?.adminlistAllFinancialInstituion?.status ===
        ApiResponse.ERROR
    ) {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

async function FetchAllTransactions(
  data: any
): Promise<{ transactions_list: ITransactions[]; total_count: number } | any> {
  try {
    const response = await apolloClient.query({
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
                matched_payment_claims {
                  payment_claim_id
                  payment_id
                }
                spent_amount
                status
                txn_date
                bank_account_id
                is_receivable
                matched_to_payment_id
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
    if (
      response &&
      response?.data?.fetchAllTransactions?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.fetchAllTransactions?.data;
    }
    if (
      response &&
      response?.data?.fetchAllTransactions?.status === ApiResponse.ERROR
    ) {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

async function DeleteTransactions(data: any): Promise<any> {
  try {
    const response = await apolloClient.mutate({
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
    if (response?.data?.deleteTransactions?.status === ApiResponse.SUCCESS) {
      showSuccessToast(
        response?.data?.deleteTransactions?.message ||
          "Deleted selected transactions"
      );
      return true;
    }
    if (response?.data?.deleteTransactions?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.deleteTransactions?.message);
      return false;
    }
  } catch (error: any) {
    return false;
  }
}

async function FetchAllBankStatements(data: any): Promise<any> {
  try {
    const response = await apolloClient.query({
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

    if (
      response?.data?.fetchAllBankStatements?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.fetchAllBankStatements?.data;
    } else {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

async function fetchAllPayments(data: any): Promise<any> {
  try {
    const response = await apolloClient.query({
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
                payment_list_buttons

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
    if (
      response &&
      response?.data?.listAllPayments?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.listAllPayments?.data;
    } else if (
      response &&
      response?.data?.listAllPayments?.status === ApiResponse.ERROR
    ) {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

async function FetchAllBankAccounts(data: any) {
  try {
    const response = await apolloClient.query({
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

    if (
      response &&
      response?.data?.fetchAllBankAccounts?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.fetchAllBankAccounts?.data;
    }
    if (
      response &&
      response?.data?.fetchAllBankAccounts?.status === ApiResponse.ERROR
    ) {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

async function verifyBankStatementExistence(data: any): Promise<any> {
  try {
    const response = await apolloClient.query({
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

    if (
      response?.data?.checkExistenceOfBankStatement?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.checkExistenceOfBankStatement?.data;
    } else {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

async function addBankAccount(data: any): Promise<any> {
  try {
    const response = await apolloClient.mutate({
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

    if (response?.data?.addBankStatement?.status === ApiResponse.SUCCESS) {
      showSuccessToast("This bank statement has been saved.");
      return true;
    } else {
      showErrorToast(response?.data?.addBankStatement?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error?.message);
    return false;
  }
}

async function updateBankStatement(data: any): Promise<any> {
  try {
    const response = await apolloClient.mutate({
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

    if (
      response?.data?.editDetailsOfABankStatement?.status ===
      ApiResponse.SUCCESS
    ) {
      showSuccessToast("This bank statement has been updated.");
      return true;
    } else {
      showErrorToast(response?.data?.editDetailsOfABankStatement?.message);
      return false;
    }
  } catch (error: any) {
    return false;
  }
}

async function fetchBankStatementFile(data: any): Promise<any> {
  try {
    const response = await apolloClient.query({
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

    if (
      response?.data?.readFileAttachmentsOrDocuments?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.readFileAttachmentsOrDocuments?.data;
    } else {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

async function fetchBankStatementById(data: any): Promise<any> {
  try {
    const response = await apolloClient.query({
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

    if (
      response?.data?.fetchBankStatementDetails?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.fetchBankStatementDetails?.data;
    } else {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

// async function getListActionButtons(
//   getListActionButtonsInput: any
// ): Promise<any> {
//   try {
//     const response = await apolloClient.query({
//       query: gql`
//         query GetListActionButtons(
//           $getListActionButtonsInput: GetListActionButtonsInput!
//         ) {
//           getListActionButtons(
//             getListActionButtonsInput: $getListActionButtonsInput
//           ) {
//             data {
//               claim_list_buttons
//               claim_overview_buttons
//               claim_type
//               current_status
//               payment_list_buttons
//               payment_overview_buttons
//               payment_type
//               status_in_ui
//             }
//             message
//             status
//           }
//         }
//       `,
//       variables: {
//         getListActionButtonsInput,
//       },
//       fetchPolicy: "no-cache",
//     });

//     if (response?.data?.getListActionButtons?.status === ApiResponse.SUCCESS) {
//       return response?.data?.getListActionButtons?.data;
//     } else if (
//       response?.data?.getListActionButtons?.status === ApiResponse.ERROR
//     ) {
//       showErrorToast(response?.data?.getListActionButtons?.message);
//       return null;
//     }
//     return null;
//   } catch (error: any) {
//     showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);

//     return null;
//   }
// }

async function DeletePayments(data: any) {
  try {
    const response = await apolloClient.mutate({
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
      response?.data?.changeStatusOfAPayment?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast("Payment has been Deleted.");
      return true;
    } else {
      showErrorToast(response?.data?.changeStatusOfAPayment?.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(error?.message);
    return null;
  }
}

async function FetchBatchSuggestedMatches(data: {
  bank_account_id: number;
  company_id: number;
}): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchBatchSuggestedMatches(
          $bankAccountId: Float!
          $companyId: Float!
        ) {
          fetchBatchSuggestedMatches(
            bank_account_id: $bankAccountId
            company_id: $companyId
          ) {
            data {
              matches {
                transaction_id
                txn_amount
                match_quality
                difference_amount
                suggested_payment {
                  id
                  sub_payment_id
                  payment_id
                  sub_payment_type
                  amount
                  payment_type
                  payment_date
                  claim_type
                  client_supplier_name
                  payment_from_account_name
                  payment_to_account_name
                  project_name
                  contract_name
                  claim_amount
                  payment_claim_id
                  payment_from_account
                  payment_to_account
                  retention_account
                }
              }
              total_unmatched
              exact_match_count
              near_match_count
            }
            message
            status
          }
        }
      `,
      variables: {
        bankAccountId: data.bank_account_id,
        companyId: data.company_id,
      },
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.fetchBatchSuggestedMatches?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.fetchBatchSuggestedMatches?.data;
    }
    if (
      response?.data?.fetchBatchSuggestedMatches?.status === ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.fetchBatchSuggestedMatches?.message);
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

async function BatchMatchExactTransactions(data: {
  transaction_ids: string[];
  sub_payment_ids: number[][];
}): Promise<any> {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation BatchMatchExactTransactions(
          $transactionIds: [String!]!
          $subPaymentIds: [[Float!]!]!
        ) {
          batchMatchExactTransactions(
            transaction_ids: $transactionIds
            sub_payment_ids: $subPaymentIds
          ) {
            data {
              results {
                transaction_id
                success
                error
              }
              succeeded
              failed
              payment_ids
            }
            message
            status
          }
        }
      `,
      variables: {
        transactionIds: data.transaction_ids,
        subPaymentIds: data.sub_payment_ids,
      },
    });

    if (
      response?.data?.batchMatchExactTransactions?.status ===
      ApiResponse.SUCCESS
    ) {
      showSuccessToast(
        response?.data?.batchMatchExactTransactions?.message ||
          "Transactions matched successfully"
      );
      return response?.data?.batchMatchExactTransactions?.data;
    }
    if (
      response?.data?.batchMatchExactTransactions?.status === ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.batchMatchExactTransactions?.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast("Failed to batch match transactions");
    return null;
  }
}

async function QuickAdjustAndMatch(data: {
  transaction_id: string;
  sub_payment_id: number;
}): Promise<any> {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation QuickAdjustAndMatch(
          $transactionId: String!
          $subPaymentId: Float!
        ) {
          quickAdjustAndMatch(
            transaction_id: $transactionId
            sub_payment_id: $subPaymentId
          ) {
            data {
              adjustment_payment_id
              adjustment_type
              adjustment_amount
              payment_ids
            }
            message
            status
          }
        }
      `,
      variables: {
        transactionId: data.transaction_id,
        subPaymentId: data.sub_payment_id,
      },
    });

    if (response?.data?.quickAdjustAndMatch?.status === ApiResponse.SUCCESS) {
      showSuccessToast(
        response?.data?.quickAdjustAndMatch?.message ||
          "Adjust and match completed"
      );
      return response?.data?.quickAdjustAndMatch?.data;
    }
    if (response?.data?.quickAdjustAndMatch?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.quickAdjustAndMatch?.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast("Failed to adjust and match");
    return null;
  }
}

export {
  fetchBankAccountDetails,
  AdminlistAllFinancialInstitution,
  FetchAllTransactions,
  DeleteTransactions,
  FetchAllBankStatements,
  fetchAllPayments,
  FetchAllBankAccounts,
  verifyBankStatementExistence,
  addBankAccount,
  updateBankStatement,
  fetchBankStatementFile,
  fetchBankStatementById,
  // getListActionButtons,
  DeletePayments,
  FetchBatchSuggestedMatches,
  BatchMatchExactTransactions,
  QuickAdjustAndMatch,
};
