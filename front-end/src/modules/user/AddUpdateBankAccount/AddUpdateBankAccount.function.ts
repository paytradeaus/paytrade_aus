import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
} from "@/components/Toaster";
import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";

import { gql } from "@apollo/client";
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
