import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";

export const AddInterestChargesPayment = async (data: any): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation AddPayment($payload: AddPaymentInput!) {
          addPayment(payload: $payload) {
            message
            status
            data {
              payment_id
            }
          }
        }
      `,
      variables: {
        payload: data,
      },
    });

    if (response?.data?.addPayment?.status === ApiResponse.SUCCESS) {
      showSuccessToast(
        response?.data?.addPayment?.message ||
          "This interest/charge has been added."
      );
      return response?.data?.addPayment?.data;
    }
    if (response?.data?.addPayment?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.addPayment?.message);
      return false;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  }
};

export const UpdateInterestChargesPaymentStatus = async (
  data: any
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
    });

    if (response?.data?.editDetailsOfAPayment?.status === ApiResponse.SUCCESS) {
      showSuccessToast(
        response?.data?.editDetailsOfAPayment?.message ||
          "This payment has been updated."
      );
      return true;
    }
    if (response?.data?.editDetailsOfAPayment?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.editDetailsOfAPayment?.message);
      return false;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  }
};

export const GetTrusteeWithdrawalShortfall = async (
  payload: any
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetTrusteeWithdrawalShortfall(
          $bankAccountId: Float!
          $paymentAmount: Float!
        ) {
          getTrusteeWithdrawalShortfall(
            payload: {
              bank_account_id: $bankAccountId
              payment_amount: $paymentAmount
            }
          ) {
            data {
              applicable
              has_shortfall
              current_balance
              outstanding_claims
              balance_after
              shortfall_amount
            }
            message
            status
          }
        }
      `,
      variables: payload,
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.getTrusteeWithdrawalShortfall?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.getTrusteeWithdrawalShortfall?.data;
    }
    if (
      response?.data?.getTrusteeWithdrawalShortfall?.status ===
      ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.getTrusteeWithdrawalShortfall?.message);
      return false;
    }
    return false;
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  }
};

export const GetProjectList = async (payload: any): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetProjectsLists(
          $companyId: Float!
          $bankAccountId: Float
          $isArchived: Boolean
        ) {
          getProjectsLists(
            company_id: $companyId
            bank_account_id: $bankAccountId
            is_archived: $isArchived
          ) {
            data {
              id
              project_id
              project_name
              project_role
              project_status
              pta_eligibility
              rta_eligibility
            }
            message
            status
          }
        }
      `,
      variables: payload,
    });

    if (response?.data?.getProjectsLists?.status === ApiResponse.SUCCESS) {
      return response?.data?.getProjectsLists?.data;
    }
    if (response?.data?.getProjectsLists?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.getProjectsLists?.message);
      return response?.data?.getProjectsLists;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  }
};

export const GetClientSupplierList = async (data: any): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetClientSuppliersListByProjectId(
          $getClientSuppliersListForProjectsInput: GetClientSuppliersListForProjectsInput!
        ) {
          getClientSuppliersListByProjectId(
            getClientSuppliersListForProjectsInput: $getClientSuppliersListForProjectsInput
          ) {
            data {
              client_suppliers_list {
                abn_number
                acn_number
                business_name
                claim_count
                client_email_id
                client_phone_no
                client_supplier_address
                client_supplier_id
                client_supplier_name
                client_supplier_status
                client_supplier_type
                client_website
                company_id
                contract_count
                country
                created_by
                created_on
                entity_type
                id
                latitude
                longitude
                payment_terms
                place_id
                qbcc_number
                region
                related_entity
                tfn_number
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: {
        getClientSuppliersListForProjectsInput: data,
      },
    });

    if (
      response?.data?.getClientSuppliersListByProjectId?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.getClientSuppliersListByProjectId?.data;
    }
    if (
      response?.data?.getClientSuppliersListByProjectId?.status ===
      ApiResponse.ERROR
    ) {
      showErrorToast(
        response?.data?.getClientSuppliersListByProjectId?.message
      );
      return response?.data?.getClientSuppliersListByProjectId;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  }
};

export const GetPaymentById = async (data: any): Promise<any> => {
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
      variables: {
        payload: data,
      },
    });
    if (
      response?.data?.fetchDetailsOfAPayment?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.fetchDetailsOfAPayment?.data;
    }
    if (response?.data?.fetchDetailsOfAPayment?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.fetchDetailsOfAPayment?.message);
      return response?.data?.fetchDetailsOfAPayment;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  }
};

export const FileUploads = async (data: any): Promise<any> => {
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
      variables: {
        payload: data,
      },
    });
    if (
      response?.data?.readFileAttachmentsOrDocuments?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.readFileAttachmentsOrDocuments?.data;
    }
    if (
      response?.data?.readFileAttachmentsOrDocuments?.status ===
      ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.readFileAttachmentsOrDocuments?.message);
      return response?.data?.readFileAttachmentsOrDocuments;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  }
};

export const GetPaymentAttachments = async (data: any): Promise<any> => {
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
      variables: {
        payload: {
          data: data,
          fileAttachmentOrDocumentType: "Other payment attachment",
        },
      },
    });

    if (
      response?.data?.readFileAttachmentsOrDocuments?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.readFileAttachmentsOrDocuments?.data;
    }
    if (
      response?.data?.readFileAttachmentsOrDocuments?.status ===
      ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.readFileAttachmentsOrDocuments?.message);
      return response?.data?.readFileAttachmentsOrDocuments;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  }
};

export const DeletePayments = async (data: any): Promise<any> => {
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
