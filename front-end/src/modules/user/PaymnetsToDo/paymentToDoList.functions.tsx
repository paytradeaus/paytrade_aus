import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { PaymentData } from "./paymentToDoList.types";
import { gql } from "@apollo/client";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";

export const ListAllPaymentsInput = async (
  data: any,
  setLoading?: Function
): Promise<{ payments: PaymentData[]; total_count: number } | any> => {
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
                list_status
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
                payment_list_buttons
                status
                third_party_payment_reason
                total_amount
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
      response?.data?.listAllPayments?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.listAllPayments?.data;
    }
    if (
      response &&
      response?.data?.listAllPayments?.status === ApiResponse.ERROR
    ) {
      return null;
    }
  } catch {
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const editDetailsOfAPayment = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation EditDetailsOfAPayment($payload: EditDetailsOfAPaymentInput!) {
          editDetailsOfAPayment(payload: $payload) {
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
      fetchPolicy: "no-cache",
    });
    if (response?.data?.editDetailsOfAPayment?.status === ApiResponse.SUCCESS) {
      showSuccessToast(successMsg || "Payment status updated successfully");
      return response?.data?.editDetailsOfAPayment?.data;
    }
    if (response?.data?.editDetailsOfAPayment?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.editDetailsOfAPayment?.message);
      return false;
    }
  } catch {
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};

export const fetchAllPaymentsList = async (
  data: any,
  setLoading?: Function
): Promise<{ payments: PaymentData[]; total_count: number } | any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query ListAllSubPayments($payload: ListSubPaymentsInput!) {
          listAllSubPayments(payload: $payload) {
            data {
              total_count
              payments {
                amount
                id
                payment_date
                payment_from_account
                payment_from_account_name
                payment_id
                payment_to_account
                payment_to_account_bsb_number
                payment_to_account_name
                payment_to_account_number
                status
                sub_payment_id
                sub_payment_type
                is_late
                list_status
                payment_type
                claim_type
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

    if (
      response &&
      response?.data?.listAllSubPayments?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.listAllSubPayments?.data;
    }
    if (
      response &&
      response?.data?.listAllSubPayments?.status === ApiResponse.ERROR
    ) {
      return null;
    }
  } catch {
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const fetchABAFileHistoryList = async (
  data: any,
  setLoading?: Function
): Promise<{ payments: PaymentData[]; total_count: number } | any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetABAFileHistoryList($payload: GetABAFileHistoryInput!) {
          getABAFileHistoryList(payload: $payload) {
            data {
              list {
                aba_file_id
                aba_file_name
                aba_file_path
                account_name
                bank_account_id
                company_id
                company_name
                created_on
                generated_by
                id
                mark_paid
                payment_count
                total_amount
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
      response?.data?.getABAFileHistoryList?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.getABAFileHistoryList?.data;
    }
    if (
      response &&
      response?.data?.getABAFileHistoryList?.status === ApiResponse.ERROR
    ) {
      return null;
    }
  } catch {
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

// Task #286 — fetch the per-batch summary (header + payments) for the
// ABA history "View" eye-icon modal. Legacy batches generated before
// the sub_payments ↔ batch link existed return `is_legacy: true` and
// an empty payments array.
export const fetchABABatchSummary = async (
  aba_history_id: string,
  company_id: number,
): Promise<any | null> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetABABatchSummary($payload: GetABABatchSummaryInput!) {
          getABABatchSummary(payload: $payload) {
            status
            message
            data {
              id
              created_on
              account_name
              aba_file_name
              mark_paid
              payment_count
              total_amount
              is_legacy
              control_payment_count
              control_total_amount
              reconcile_mismatch
              payments {
                sub_payment_id
                payee_name
                bsb_number
                account_number
                reference
                amount
              }
            }
          }
        }
      `,
      variables: { payload: { aba_history_id, company_id } },
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.getABABatchSummary?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.getABABatchSummary?.data;
    }
    return null;
  } catch {
    return null;
  }
};

export const deleteABAFileHistory = async (
  aba_history_id: string,
  company_id: number,
): Promise<{ status: string; message: string } | null> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation DeleteABAFileHistory(
          $aba_history_id: String!
          $company_id: Float!
        ) {
          deleteABAFileHistory(
            aba_history_id: $aba_history_id
            company_id: $company_id
          ) {
            status
            message
          }
        }
      `,
      variables: { aba_history_id, company_id },
      fetchPolicy: "no-cache",
    });
    return response?.data?.deleteABAFileHistory || null;
  } catch {
    return null;
  }
};

export const TriggerPaymentNotices = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation TriggerPaymentNotices($payload: triggerPaymentNoticesInput!) {
          triggerPaymentNotices(payload: $payload) {
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
    const res = response?.data?.triggerPaymentNotices;
    if (res?.status === "SUCCESS") {
      showSuccessToast(res?.message);
      // ✅ return the actual previews array
      return {
        notice_previews: res?.data?.notice_previews || [],
        qbcc_notice_previews: res?.data?.qbcc_notice_previews || [],
      };
    }
    if (res?.status === "ERROR") {
      showErrorToast(res?.message);
      console.error(res);
      return { notice_previews: [], qbcc_notice_previews: [] };
    }
  } catch (error: any) {
    showErrorToast(error.message || "Something went wrong in API");
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};
