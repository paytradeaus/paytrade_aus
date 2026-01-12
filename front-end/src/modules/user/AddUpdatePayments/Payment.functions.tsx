import { SOMETHING_WENT_WRONG } from "@/app/message";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

export async function fetchPayments(postData: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchAutoPopulatableFieldsWhileAddingAPayment(
          $payload: FetchAutoPopulatableFieldsWhileAddingAPaymentInput!
        ) {
          fetchAutoPopulatableFieldsWhileAddingAPayment(payload: $payload) {
            data {
              beneficiary_type
              cash_retention
              cash_retention_type
              claim_amount
              claim_memo
              claim_reference
              claim_type
              client_supplier_address
              client_supplier_id
              client_supplier_name
              client_supplier_role
              client_supplier_type
              company_id
              contract_id
              contract_name
              due_date
              formatted_claim_amount
              formatted_gst_summary
              formatted_outstanding_amount
              formatted_payless_amount
              formatted_payment_amount
              formatted_retention_amount
              formatted_retention_amount_with_gst
              retention_amount_with_gst
              outstanding_retention_amount
              formatted_outstanding_retention_amount
              defect_liability_end_date
              gst_summary
              has_claim_retention
              retention_amount
              cash_retention
              retention_percentage
              claim_retention_amount
              formatted_claim_retention_amount
              invoices {
                description
                formatted_gst
                formatted_total_amount_including_gst
                formatted_unit_price
                gst
                payment_claim_id
                quantity
                total_amount_including_gst
                unit_price
              }
              is_gst_optional
              outstanding_amount
              payless_amount
              payment_amount
              payment_claim_id
              payment_date
              payment_from_account
              payment_from_account_bsb_number
              payment_from_account_name
              payment_from_account_number
              payment_from_account_type
              payment_overview_buttons
              payment_terms
              payment_to_account
              payment_to_account_bsb_number
              payment_to_account_name
              payment_to_account_number
              payment_to_account_type
              payment_type
              project_id
              project_name
              received_date
              retention_amount
              retention_from_account
              retention_id
              retention_list_id
              retention_release_date
              retention_type
              sent_date
              status
              status_in_ui
              total_amount
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
      response?.data?.fetchAutoPopulatableFieldsWhileAddingAPayment?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.fetchAutoPopulatableFieldsWhileAddingAPayment
        ?.data;
    } else {
      return {};
    }
  } catch (error: any) {
    return {};
  }
}

export async function fetchRetentionBankAccounts(postData: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query Data($payload: FetchAllBankAccountsInput!) {
          fetchAllBankAccounts(payload: $payload) {
            data {
              extendedBankAccounts {
                bank_account_id
                account_name
                account_number
                account_type
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.fetchAllBankAccounts?.status === ApiResponse.SUCCESS) {
      return response?.data?.fetchAllBankAccounts?.data?.extendedBankAccounts;
    } else {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

export async function addPayments(postData: any): Promise<any> {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation AddPayment($payload: AddPaymentInput!) {
          addPayment(payload: $payload) {
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
              payment_id
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.addPayment?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.addPayment?.message);
      return {
        data: response?.data?.addPayment?.data,
        status: true,
      };
    } else {
      showErrorToast(response?.data?.addPayment?.message);
      return {
        data: null,
        status: false,
      };
    }
  } catch (error: any) {
    showErrorToast(error);

    return false;
  }
}

export async function fetchViewPayments(postData: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchDetailsOfAPayment($payload: FetchDetailsOfAPaymentInput!) {
          fetchDetailsOfAPayment(payload: $payload) {
            data {
              associated_overpayment_details {
                associated_overpayment_id
                associated_payment_id
                beneficiary_type
                cash_retention
                cash_retention_type
                claim_amount
                claim_memo
                claim_reference
                claim_type
                client_supplier_address
                client_supplier_id
                client_supplier_name
                client_supplier_role
                client_supplier_type
                compulsory_attachment_ids
                contract_date
                contract_id
                contract_name
                due_date
                formatted_claim_amount
                formatted_payless_amount
                formatted_payment_amount
                formatted_retention_amount
                formatted_total_amount
                gst_summary
                input_date
                invoices {
                  description
                  formatted_gst
                  formatted_total_amount_including_gst
                  formatted_unit_price
                  gst
                  payment_claim_id
                  quantity
                  total_amount_including_gst
                  unit_price
                }
                is_gst_optional
                is_paid_confirmed
                is_received_confirmed
                is_retention_confirmed
                list_status
                matched_transactions
                memo
                optional_attachment_ids
                outstanding_amount
                payless_amount
                payment_amount
                payment_claim_id
                payment_date
                payment_from_account
                payment_from_account_bsb_number
                payment_from_account_name
                payment_from_account_number
                payment_from_account_type
                payment_id
                payment_overview_buttons
                payment_terms
                payment_to_account
                payment_to_account_bsb_number
                payment_to_account_name
                payment_to_account_number
                payment_to_account_type
                payment_type
                project_date
                project_id
                project_name
                received_date
                retention_account
                retention_account_name
                retention_account_number
                retention_amount
                retention_id
                retention_list_id
                retention_release_date
                retention_type
                sent_date
                status
                status_in_ui
                third_party_payment_reason
                total_amount
                withhold_payment_reason
              }
              associated_overpayment_id
              associated_payment_details {
                associated_overpayment_id
                associated_payment_id
                beneficiary_type
                cash_retention
                cash_retention_type
                claim_amount
                claim_memo
                claim_reference
                claim_type
                client_supplier_address
                client_supplier_id
                client_supplier_name
                client_supplier_role
                client_supplier_type
                compulsory_attachment_ids
                contract_date
                contract_id
                contract_name
                due_date
                formatted_claim_amount
                formatted_payless_amount
                formatted_payment_amount
                formatted_retention_amount
                formatted_total_amount
                gst_summary
                input_date
                invoices {
                  description
                  formatted_gst
                  formatted_total_amount_including_gst
                  formatted_unit_price
                  gst
                  payment_claim_id
                  quantity
                  total_amount_including_gst
                  unit_price
                }
                is_gst_optional
                is_paid_confirmed
                is_received_confirmed
                is_retention_confirmed
                list_status
                matched_transactions
                memo
                optional_attachment_ids
                outstanding_amount
                payless_amount
                payment_amount
                payment_claim_id
                payment_date
                payment_from_account
                payment_from_account_bsb_number
                payment_from_account_name
                payment_from_account_number
                payment_from_account_type
                payment_id
                payment_overview_buttons
                payment_terms
                payment_to_account
                payment_to_account_bsb_number
                payment_to_account_name
                payment_to_account_number
                payment_to_account_type
                payment_type
                project_date
                project_id
                project_name
                received_date
                retention_account
                retention_account_name
                retention_account_number
                retention_amount
                retention_id
                retention_list_id
                retention_release_date
                retention_type
                sent_date
                status
                status_in_ui
                third_party_payment_reason
                total_amount
                withhold_payment_reason
              }
              associated_payment_id
              beneficiary_type
              cash_retention
              cash_retention_type
              claim_amount
              claim_memo
              claim_reference
              claim_retention_amount
              claim_type
              client_supplier_address
              client_supplier_id
              client_supplier_name
              client_supplier_role
              client_supplier_type
              compulsory_attachment_ids
              contract_date
              contract_id
              contract_name
              defect_liability_end_date
              due_date
              formatted_claim_amount
              formatted_claim_retention_amount
              formatted_payless_amount
              formatted_payment_amount
              formatted_retention_amount
              formatted_retention_amount_with_gst
              formatted_total_amount
              gst_summary
              has_claim_retention
              input_date
              invoices {
                description
                formatted_gst
                formatted_total_amount_including_gst
                formatted_unit_price
                gst
                payment_claim_id
                quantity
                total_amount_including_gst
                unit_price
              }
              is_gst_optional
              is_paid_confirmed
              is_received_confirmed
              is_retention_confirmed
              list_status
              matched_transactions
              memo
              optional_attachment_ids
              outstanding_amount
              payless_amount
              payment_amount
              payment_claim_id
              payment_date
              payment_from_account
              payment_from_account_bsb_number
              payment_from_account_name
              payment_from_account_number
              payment_from_account_type
              payment_id
              payment_list_buttons
              payment_overview_buttons
              payment_terms
              payment_to_account
              payment_to_account_bsb_number
              payment_to_account_name
              payment_to_account_number
              payment_to_account_type
              payment_type
              project_date
              project_id
              project_name
              received_date
              retention_account
              retention_account_name
              retention_account_number
              retention_amount
              retention_amount_with_gst
              retention_id
              retention_list_id
              retention_percentage
              retention_release_date
              retention_type
              sent_date
              status
              status_in_ui
              third_party_payment_reason
              total_amount
              withhold_payment_reason
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
      response?.data?.fetchDetailsOfAPayment?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.fetchDetailsOfAPayment?.data;
    } else {
      return {};
    }
  } catch (error: any) {
    return {};
  }
}

export async function fetchPaymentsTransactions(postData: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchAllSubPaymentsOfAPayment(
          $payload: FetchAllSubPaymentsOfAPaymentInput!
        ) {
          fetchAllSubPaymentsOfAPayment(payload: $payload) {
            data {
              payment_amount
              payment_to_account_id
              payment_to_account_name
              payment_transaction_id
              status
              sub_payment_type
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
      response?.data?.fetchAllSubPaymentsOfAPayment?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.fetchAllSubPaymentsOfAPayment?.data;
    } else {
      return {};
    }
  } catch (error: any) {
    return {};
  }
}

export async function fetchMatchedTransactions(postData: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchAllTheMatchedTransactionsOfAPayment(
          $payload: FetchAllTheMatchedTransactionsOfAPaymentInput!
        ) {
          fetchAllTheMatchedTransactionsOfAPayment(payload: $payload) {
            data {
              description
              transaction_date
              txn_amount
              unique_txn_id
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
      response?.data?.fetchAllTheMatchedTransactionsOfAPayment?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.fetchAllTheMatchedTransactionsOfAPayment?.data;
    } else {
      return {};
    }
  } catch (error: any) {
    return {};
  }
}

export async function updatePayments(postData: any): Promise<any> {
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
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.editDetailsOfAPayment?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.editDetailsOfAPayment?.message);
      return response?.data?.editDetailsOfAPayment?.data;
    } else {
      showErrorToast(response?.data?.editDetailsOfAPayment?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error);

    return false;
  }
}
export const deletePayment = async (data: any): Promise<any> => {
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
    }
    if (
      response &&
      response?.data?.changeStatusOfAPayment?.status === ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.changeStatusOfAPayment?.message);

      return false;
    }
  } catch (error: any) {
    showErrorToast(error || SOMETHING_WENT_WRONG);

    return false;
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
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};
