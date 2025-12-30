import { client } from "@/app/api/apolloClientServices";
import {
  ERROR,
  SOMETHING_WENT_WRONG,
  SUCCESS,
} from "@/common/constants/messages";
import { gql } from "@apollo/client";
import { toast } from "@/app/Toaster";

export const AddInterestChargesPayment = async (data: any): Promise<any> => {
  try {
    const response = await client.mutate({
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

    if (response?.data?.addPayment?.status === SUCCESS) {
      toast.success(
        response?.data?.addPayment?.message ||
          "This interest/charge has been added."
      );
      return response?.data?.addPayment?.data;
    }
    if (response?.data?.addPayment?.status === ERROR) {
      toast.error(response?.data?.addPayment?.message);
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
    const response = await client.mutate({
      mutation: gql`
        mutation EditDetailsOfAPayment($payload: EditDetailsOfAPaymentInput!) {
          editDetailsOfAPayment(payload: $payload) {
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

    if (response?.data?.editDetailsOfAPayment?.status === SUCCESS) {
      toast.success(
        response?.data?.editDetailsOfAPayment?.message ||
          "This payment has been updated."
      );
      return true;
    }
    if (response?.data?.editDetailsOfAPayment?.status === ERROR) {
      toast.error(response?.data?.editDetailsOfAPayment?.message);
      return false;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  }
};

export const GetProjectList = async (companyId: any): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query GetProjectsLists($companyId: Float!) {
          getProjectsLists(company_id: $companyId) {
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
      variables: {
        companyId,
      },
    });

    if (response?.data?.getProjectsLists?.status === SUCCESS) {
      return response?.data?.getProjectsLists?.data;
    }
    if (response?.data?.getProjectsLists?.status === ERROR) {
      toast.error(response?.data?.getProjectsLists?.message);
      return response?.data?.getProjectsLists;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  }
};

export const GetClientSupplierList = async (data: any): Promise<any> => {
  try {
    const response = await client.query({
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

    if (response?.data?.getClientSuppliersListByProjectId?.status === SUCCESS) {
      return response?.data?.getClientSuppliersListByProjectId?.data;
    }
    if (response?.data?.getClientSuppliersListByProjectId?.status === ERROR) {
      toast.error(response?.data?.getClientSuppliersListByProjectId?.message);
      return response?.data?.getClientSuppliersListByProjectId;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  }
};

export const GetPaymentById = async (data: any): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query FetchDetailsOfAPayment($payload: FetchDetailsOfAPaymentInput!) {
          fetchDetailsOfAPayment(payload: $payload) {
            data {
              cash_retention
              cash_retention_type
              claim_amount
              list_status
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
              status_in_ui
              payment_overview_buttons
              beneficiary_type
              associated_payment_id
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
    if (response?.data?.fetchDetailsOfAPayment?.status === SUCCESS) {
      return response?.data?.fetchDetailsOfAPayment?.data;
    }
    if (response?.data?.fetchDetailsOfAPayment?.status === ERROR) {
      toast.error(response?.data?.fetchDetailsOfAPayment?.message);
      return response?.data?.fetchDetailsOfAPayment;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  }
};

export const FileUploads = async (data: any): Promise<any> => {
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
      variables: {
        payload: data,
      },
    });
    if (response?.data?.readFileAttachmentsOrDocuments?.status === SUCCESS) {
      return response?.data?.readFileAttachmentsOrDocuments?.data;
    }
    if (response?.data?.readFileAttachmentsOrDocuments?.status === ERROR) {
      toast.error(response?.data?.readFileAttachmentsOrDocuments?.message);
      return response?.data?.readFileAttachmentsOrDocuments;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  }
};

export const GetPaymentAttachments = async (data: any): Promise<any> => {
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
      variables: {
        payload: {
          data: data,
          fileAttachmentOrDocumentType: "Other payment attachment",
        },
      },
    });

    if (response?.data?.readFileAttachmentsOrDocuments?.status === SUCCESS) {
      return response?.data?.readFileAttachmentsOrDocuments?.data;
    }
    if (response?.data?.readFileAttachmentsOrDocuments?.status === ERROR) {
      toast.error(response?.data?.readFileAttachmentsOrDocuments?.message);
      return response?.data?.readFileAttachmentsOrDocuments;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  }
};
