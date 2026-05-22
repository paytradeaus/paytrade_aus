import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
} from "@/components/Toaster";
import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";

import { gql } from "@apollo/client";

export const skipXeroAutoCreate = async (
  bankAccountId: number
): Promise<boolean> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation SkipXeroAutoCreate($bankAccountId: Float!) {
          skipXeroAutoCreate(bank_account_id: $bankAccountId) {
            message
            status
          }
        }
      `,
      variables: { bankAccountId },
    });
    return (
      response?.data?.skipXeroAutoCreate?.status === ApiResponse.SUCCESS
    );
  } catch {
    return false;
  }
};
import { IBankTrustAccountDetails } from "../BankAccounts/bankTrustAccount.types";

export interface BankAccount {
  acc_number_maxlength: number;
  created_on: string;
  id: string;
  institution_code: string;
  institution_name: string;
  institution_status: string;
  place: null | string;
}

export const AdminListAllFinancialInstitution = async (
  data: any
): Promise<{ institutions: BankAccount[]; totalCount: number } | any> => {
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
};

export const FetchBankAccountDetailsForEditing = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
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
              apca_number
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
    if (
      response?.data?.fetchBankAccountDetailsForEditing?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.fetchBankAccountDetailsForEditing?.data;
    }
    if (
      response?.data?.fetchBankAccountDetailsForEditing?.status ===
      ApiResponse.SUCCESS
    ) {
      showErrorToast(
        response?.data?.fetchBankAccountDetailsForEditing?.message
      );
      return {};
    }
  } catch (error: any) {
    return {};
  }
};

export const AddBankAccount = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation AddBankAccount($payload: AddBankAccountInput!) {
          addBankAccount(payload: $payload) {
            data {
              bank_account_id
              notices {
                notice_previews {
                  file_details {
                    attachment_type
                    file
                    file_name
                    file_path
                    file_type
                    id
                  }
                  mail_uuid
                }
                qbcc_notice_previews {
                  notice_uuid
                  qbcc_file_details {
                    attachment_type
                    file
                    file_name
                    file_path
                    file_type
                    id
                  }
                }
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
    });

    if (response?.data?.addBankAccount?.status === ApiResponse.SUCCESS) {
      showSuccessToast(successMsg || " This bank account has been added.");
      return response?.data?.addBankAccount?.data;
    }
    if (response?.data?.addBankAccount?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.addBankAccount?.message);
      return false;
    }
    if (response?.data?.addBankAccount?.status === "WARNING") {
      showWarningToast(response?.data?.addBankAccount?.message);
      return false;
    }
  } catch (error: any) {
    return false;
  }
};

export const TriggerAccountNotices = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation TriggerAccountNotices($payload: triggerAccountNoticesInput!) {
          triggerAccountNotices(payload: $payload) {
            data {
              notice_previews {
                file_details {
                  attachment_type
                  file
                  file_name
                  file_path
                  file_type
                  id
                }
                mail_uuid
              }
              qbcc_notice_previews {
                notice_uuid
                qbcc_file_details {
                  attachment_type
                  file
                  file_name
                  file_path
                  file_type
                  id
                }
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

    const resData = response?.data?.triggerAccountNotices;

    if (resData?.status === "SUCCESS") {
      showSuccessToast(resData?.message);
      // return notice previews here instead of just true
      // return both types
      return {
        notice_previews: resData?.data?.notice_previews || [],
        qbcc_notice_previews: resData?.data?.qbcc_notice_previews || [],
      };
    }

    if (resData?.status === "ERROR") {
      showErrorToast(resData?.message);
      console.error(resData);
      return { notice_previews: [], qbcc_notice_previews: [] };
    }
  } catch (error: any) {
    showErrorToast(error.message || "Something went wrong in API");

    return false;
  }
};

export const SendMailForNotices = async (
  ids: string[],
  setLoading?: Function
): Promise<boolean> => {
  try {
    if (setLoading) setLoading(true);

    const response = await apolloClient.mutate({
      mutation: gql`
        mutation SentMailForANotice(
          $multiPayload: SentMailForMultipleNoticesInput
        ) {
          sentMailForANotice(multiPayload: $multiPayload) {
            message
            status
          }
        }
      `,
      variables: {
        multiPayload: {
          ids, // 👈 directly map the array of mail_uuids here
        },
      },
      fetchPolicy: "no-cache",
    });

    const resData = response?.data?.sentMailForANotice;

    if (resData?.status === "SUCCESS") {
      showSuccessToast(resData?.message);
      return true;
    }

    if (resData?.status === "ERROR") {
      showErrorToast(resData?.message);
      console.error(resData);
      return false;
    }

    return false;
  } catch (error: any) {
    showErrorToast(error.message || "Something went wrong while sending mail");
    return false;
  } finally {
    if (setLoading) setLoading(false);
  }
};

export const SendQbccMailForNotices = async (
  ids: string[],
  setLoading?: Function
): Promise<boolean> => {
  try {
    if (setLoading) setLoading(true);

    const response = await apolloClient.mutate({
      mutation: gql`
        mutation SentAdminMailForQbccNotice(
          $multiPayload: SentMailForMultipleNoticesInput
          $viewPreview: Boolean
        ) {
          sentAdminMailForQbccNotice(
            multiPayload: $multiPayload
            view_preview: $viewPreview
          ) {
            message
            status
            qbcc_notice_file {
              notice_uuid
            }
          }
        }
      `,
      variables: {
        multiPayload: {
          ids, // 👈 directly map the array of mail_uuids here
        },
      },
      fetchPolicy: "no-cache",
    });

    const resData = response?.data?.sentAdminMailForQbccNotice;

    if (resData?.status === "SUCCESS") {
      showSuccessToast(resData?.message);
      return true;
    }

    if (resData?.status === "ERROR") {
      showErrorToast(resData?.message);
      console.error(resData);
      return false;
    }

    return false;
  } catch (error: any) {
    showErrorToast(error.message || "Something went wrong while sending mail");
    return false;
  } finally {
    if (setLoading) setLoading(false);
  }
};

export const FetchAllBankAccounts = async (
  data: any,
  setLoading?: Function
): Promise<
  { admins: IBankTrustAccountDetails[]; totalCount: number } | any
> => {
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
};
export const EditDetailsOfABankAccount = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation EditDetailsOfABankAccount(
          $payload: EditDetailsOfABankAccountInput!
        ) {
          editDetailsOfABankAccount(payload: $payload) {
            data {
              notices {
                notice_previews {
                  file_details {
                    attachment_type
                    file
                    file_name
                    file_path
                    file_type
                    id
                  }
                  mail_uuid
                }
                qbcc_notice_previews {
                  notice_uuid
                  qbcc_file_details {
                    attachment_type
                    file
                    file_name
                    file_path
                    file_type
                    id
                  }
                }
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
    });
    if (
      response?.data?.editDetailsOfABankAccount?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(successMsg || "This bank account has been updated");
      return response?.data?.editDetailsOfABankAccount?.data;
    }
    if (
      response?.data?.editDetailsOfABankAccount?.status === ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.editDetailsOfABankAccount?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);

    return false;
  }
};

export const CloseOrChangeBankAccount = async (
  data: any,
  successMsg?: string
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation CloseOrChangeBankAccount(
          $payload: CloseOrChangeBankAccountInput!
        ) {
          closeOrChangeBankAccount(payload: $payload) {
            data
            message
            status
          }
        }
      `,
      variables: { payload: data },
    });
    if (
      response?.data?.closeOrChangeBankAccount?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(
        successMsg ||
          response?.data?.closeOrChangeBankAccount?.message ||
          "Account closing notices have been queued."
      );
      return response?.data?.closeOrChangeBankAccount?.data ?? true;
    }
    if (
      response?.data?.closeOrChangeBankAccount?.status === ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.closeOrChangeBankAccount?.message);
      return false;
    }
    return false;
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);
    return false;
  }
};

// =====================================================================
// Task #244 — Trust Account Transfer wizard GraphQL helpers.
// =====================================================================

export const GetBankAccountPreflight = async (
  bank_account_id: number,
): Promise<any> => {
  try {
    const resp = await apolloClient.query({
      query: gql`
        query GetBankAccountPreflight($payload: GetBankAccountPreflightInput!) {
          getBankAccountPreflight(payload: $payload) {
            warning
            warningMessage
            preflight {
              bank_account_id
              account_name
              account_type
              status
              current_balance
              open_claims_count
              in_flight_payments_count
              open_retention_count
              unreconciled_transactions_count
              can_close
              can_transfer
              close_blockers
              transfer_blockers
              open_claims { id reference amount status }
              in_flight_payments { id reference amount status }
              open_retention {
                id
                amount
                status
                payment_id
                contract_id
                project_id
                project_name
                party_name
                reference
              }
              linked_projects { project_id project_name contract_id client_supplier_name }
            }
          }
        }
      `,
      variables: { payload: { bank_account_id } },
      fetchPolicy: "no-cache",
    });
    return resp?.data?.getBankAccountPreflight ?? null;
  } catch (e: any) {
    showErrorToast(e?.message || ApiResponse.SOMETHING_WENT_WRONG);
    return null;
  }
};

export const StartTrustAccountTransfer = async (payload: {
  source_bank_account_id: number;
  destination_bank_account_id: number;
  transfer_date: string;
  amount: number;
  carry_across_choices?: Record<string, any>;
}): Promise<any> => {
  try {
    const resp = await apolloClient.mutate({
      mutation: gql`
        mutation StartTrustAccountTransfer($payload: StartTrustAccountTransferInput!) {
          startTrustAccountTransfer(payload: $payload) {
            warning
            warningMessage
            successMessage
            transfer { transfer_id status amount transfer_date bank_transfer_reference }
          }
        }
      `,
      variables: { payload },
    });
    const out = resp?.data?.startTrustAccountTransfer;
    if (out?.warning) {
      showWarningToast(out.warningMessage || "Could not start transfer.");
      return null;
    }
    if (out?.successMessage) showSuccessToast(out.successMessage);
    return out?.transfer ?? null;
  } catch (e: any) {
    showErrorToast(e?.message || ApiResponse.SOMETHING_WENT_WRONG);
    return null;
  }
};

export const ConfirmTrustAccountTransfer = async (
  transfer_id: number,
): Promise<boolean> => {
  try {
    const resp = await apolloClient.mutate({
      mutation: gql`
        mutation ConfirmTrustAccountTransfer($payload: ConfirmTrustAccountTransferInput!) {
          confirmTrustAccountTransfer(payload: $payload) {
            warning
            warningMessage
            successMessage
            transfer { transfer_id status cutover_applied_at }
          }
        }
      `,
      variables: { payload: { transfer_id } },
    });
    const out = resp?.data?.confirmTrustAccountTransfer;
    if (out?.warning) {
      showWarningToast(out.warningMessage || "Could not confirm transfer.");
      return false;
    }
    if (out?.successMessage) showSuccessToast(out.successMessage);
    return true;
  } catch (e: any) {
    showErrorToast(e?.message || ApiResponse.SOMETHING_WENT_WRONG);
    return false;
  }
};

export const CancelTrustAccountTransfer = async (
  transfer_id: number,
): Promise<boolean> => {
  try {
    const resp = await apolloClient.mutate({
      mutation: gql`
        mutation CancelTrustAccountTransfer($payload: CancelTrustAccountTransferInput!) {
          cancelTrustAccountTransfer(payload: $payload) {
            warning
            warningMessage
            successMessage
          }
        }
      `,
      variables: { payload: { transfer_id } },
    });
    const out = resp?.data?.cancelTrustAccountTransfer;
    if (out?.warning) {
      showWarningToast(out.warningMessage || "Could not cancel transfer.");
      return false;
    }
    if (out?.successMessage) showSuccessToast(out.successMessage);
    return true;
  } catch (e: any) {
    showErrorToast(e?.message || ApiResponse.SOMETHING_WENT_WRONG);
    return false;
  }
};

export const RetryTrustAccountTransferCutover = async (
  transfer_id: number,
  dry_run: boolean,
): Promise<any> => {
  try {
    const resp = await apolloClient.mutate({
      mutation: gql`
        mutation RetryTrustAccountTransferCutover($payload: RetryTrustAccountTransferCutoverInput!) {
          retryTrustAccountTransferCutover(payload: $payload) {
            warning
            warningMessage
            successMessage
            dry_run_summary {
              contracts_to_repoint
              in_flight_payments_to_repoint
              retention_rows_to_migrate
              notes
            }
            transfer { transfer_id status cutover_applied_at last_error }
          }
        }
      `,
      variables: { payload: { transfer_id, dry_run } },
    });
    const out = resp?.data?.retryTrustAccountTransferCutover;
    if (out?.warning) {
      showWarningToast(out.warningMessage || "Retry failed.");
      return null;
    }
    if (out?.successMessage) showSuccessToast(out.successMessage);
    return out;
  } catch (e: any) {
    showErrorToast(e?.message || ApiResponse.SOMETHING_WENT_WRONG);
    return null;
  }
};

// Task #249 — relocate stranded retention rows on a Transferred RTA
// to a different Open RTA. Used by the StrandedRetentionPanel quick
// "Move to..." action on the bank-account detail page.
export const RelocateStrandedRetention = async (payload: {
  source_bank_account_id: number;
  destination_bank_account_id: number;
  retention_ids: number[];
}): Promise<{
  ok: boolean;
  relocated_count?: number;
  payments_repointed?: number;
} | null> => {
  try {
    const resp = await apolloClient.mutate({
      mutation: gql`
        mutation RelocateStrandedRetention(
          $payload: RelocateStrandedRetentionInput!
        ) {
          relocateStrandedRetention(payload: $payload) {
            warning
            warningMessage
            successMessage
            relocated_count
            payments_repointed
          }
        }
      `,
      variables: { payload },
    });
    const out = resp?.data?.relocateStrandedRetention;
    if (out?.warning) {
      showWarningToast(out.warningMessage || "Could not relocate retention.");
      return { ok: false };
    }
    if (out?.successMessage) showSuccessToast(out.successMessage);
    return {
      ok: true,
      relocated_count: out?.relocated_count,
      payments_repointed: out?.payments_repointed,
    };
  } catch (e: any) {
    showErrorToast(e?.message || ApiResponse.SOMETHING_WENT_WRONG);
    return null;
  }
};

export const ListOpenTrustAccountTransfers = async (
  bank_account_id?: number,
): Promise<any[]> => {
  try {
    const resp = await apolloClient.query({
      query: gql`
        query ListOpenTrustAccountTransfers($payload: ListOpenTransfersInput!) {
          listOpenTrustAccountTransfers(payload: $payload) {
            transfers {
              transfer_id
              source_bank_account_id
              destination_bank_account_id
              source_account_name
              destination_account_name
              transfer_date
              amount
              status
              transfer_payment_id
              bank_transfer_reference
              last_error
              cutover_applied_at
              created_on
            }
          }
        }
      `,
      variables: { payload: { bank_account_id: bank_account_id ?? null } },
      fetchPolicy: "no-cache",
    });
    return resp?.data?.listOpenTrustAccountTransfers?.transfers ?? [];
  } catch {
    return [];
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

export async function CheckExistenceOfBankAccountNumber(
  postData: any
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query CheckExistenceOfBankAccountNumber(
          $payload: CheckExistenceOfBankAccountNumberInput!
        ) {
          checkExistenceOfBankAccountNumber(payload: $payload) {
            data {
              is_present
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.checkExistenceOfBankAccountNumber?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.checkExistenceOfBankAccountNumber?.data;
    }
    if (
      response?.data?.checkExistenceOfBankAccountNumber?.status ===
      ApiResponse.ERROR
    ) {
      showErrorToast(
        response?.data?.checkExistenceOfBankAccountNumber?.message
      );
      return null;
    }
  } catch (error: any) {
    return {};
  }
}

export const CreateAccountInPaytrade = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation CreateAccountInPaytrade(
          $accountId: String!
          $companyId: Float!
          $payload: AddBankAccountInput
          $syncId: String
        ) {
          createAccountInPaytrade(
            account_id: $accountId
            company_id: $companyId
            payload: $payload
            sync_id: $syncId
          ) {
            message
            status
            data {
              account_id
              account_name
              account_number
              account_status
              bsb_number
              description
              id
              mapped_status
              xero_bank_account_id
            }
          }
        }
      `,
      variables: data,
    });

    if (
      response?.data?.createAccountInPaytrade?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(successMsg || " This bank account has been added.");
      return response?.data?.createAccountInPaytrade?.data?.account_id;
    }
    if (response?.data?.createAccountInPaytrade?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.createAccountInPaytrade?.message);
      return false;
    }
    if (response?.data?.createAccountInPaytrade?.status === "WARNING") {
      showWarningToast(response?.data?.createAccountInPaytrade?.message);
      return false;
    }
  } catch (error: any) {
    return false;
  }
};

export const CreateOrUpdateAccountInPaytrade = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation CreateOrUpdateAccountInPaytrade(
          $accountId: String!
          $accountStatus: String!
          $companyId: Float!
          $payload: AddBankAccountInput
          $syncId: String
        ) {
          createOrUpdateAccountInPaytrade(
            account_id: $accountId
            account_status: $accountStatus
            company_id: $companyId
            payload: $payload
            sync_id: $syncId
          ) {
            data {
              account_id
              account_name
              account_number
              account_status
              bsb_number
              description
              id
              mapped_status
              xero_bank_account_id
            }
            message
            status
          }
        }
      `,
      variables: data,
    });

    const res = response?.data?.createOrUpdateAccountInPaytrade;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      window.open(res.message, "_self");
      return null; // stop further flow
    }
    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(successMsg || " This bank account has been added.");
      return res?.data?.account_id;
    }
    if (res?.status === ApiResponse.ERROR) {
      showErrorToast(res?.message);
      return false;
    }
    if (res?.status === "WARNING") {
      showWarningToast(res?.message);
      return false;
    }
  } catch (error: any) {
    return false;
  }
};
