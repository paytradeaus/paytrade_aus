import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import apolloClient from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

export interface CheckAuditReportExistenceInput {
  bank_account_id: number;
  month_end_date: any;
  timezone: string;
  project_id: any;
}

export const checkAuditReportExistence = async (
  data: CheckAuditReportExistenceInput,
  setLoading?: Function
): Promise<any> => {
  try {
    setLoading && setLoading(true);

    const response = await apolloClient.query({
      query: gql`
        query CheckAuditReportExistence(
          $payload: CheckReportExistenceByAccountIdInput!
        ) {
          checkAuditReportExistence(payload: $payload) {
            data {
              message
              warning
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
      response.data.checkAuditReportExistence.status === "SUCCESS"
    ) {
      return response.data.checkAuditReportExistence.data;
    }
    if (
      response &&
      response.data.checkAuditReportExistence.status === "ERROR"
    ) {
      console.error(response.data.checkAuditReportExistence.message);
      return null;
    }
  } catch (error: any) {
    console.error("Error checking audit report existence:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export interface CheckNilReturnForAuditInput {
  bank_account_id: number;
  year_end_date: string;
  timezone: string;
}

export const checkNilReturnForAudit = async (
  data: CheckNilReturnForAuditInput,
  setLoading?: Function
): Promise<any> => {
  try {
    setLoading && setLoading(true);

    const response = await apolloClient.query({
      query: gql`
        query CheckNilReturnForAudit($payload: CheckNilReturnForAuditInput!) {
          checkNilReturnForAudit(payload: $payload) {
            data {
              message
              warning
            }
            message
            status
          }
        }
      `,
      variables: { payload: data },
      fetchPolicy: "no-cache",
    });

    if (response && response.data.checkNilReturnForAudit.status === "SUCCESS") {
      return response.data.checkNilReturnForAudit.data;
    }
    if (response && response.data.checkNilReturnForAudit.status === "ERROR") {
      console.error(response.data.checkNilReturnForAudit.message);
      return null;
    }
  } catch (error: any) {
    console.error("Error checking nil return for audit:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const insertAuditReportDetails = async (payload: {
  company_id: number;
  bank_account_id: number;
  audit_date: string;
  nil_return: string;
  project_id: any;
  aud_gen_to_date: any;
  aud_gen_from_date: any;
  min_aud_from_date: any;
}): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation InsertAuditReportDetails($payload: AddAuditReportInput!) {
          insertAuditReportDetails(payload: $payload) {
            data {
              audit_id
              bank_account_id
              company_id
              id
              nil_return
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

    // Handle the response
    const result = response?.data?.insertAuditReportDetails;

    if (result?.status === "SUCCESS") {
      showSuccessToast(result?.message);
      return result?.data;
    } else if (result?.status === "ERROR") {
      showErrorToast(result?.message);
      return null;
    }

    // Return null if no status is found
    return null;
  } catch (error) {
    // Handle errors
    console.error("Error in insertAuditReportDetails:", error);
    console.error("Payload:", payload);
    throw error;
  }
};

export const viewAuditReportById = async (
  data: { id: any },
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query ViewAuditReportById($viewAuditReportByIdId: String!) {
          viewAuditReportById(id: $viewAuditReportByIdId) {
            data {
              account_name
              account_type
              attachment_ids
              aud_gen_from_date
              aud_gen_to_date
              audit_date
              audit_id
              bank_account_id
              company_id
              file_details {
                attachment_type
                file
                file_name
                file_path
                file_type
                id
              }
              id
              min_aud_from_date
              nil_return
              project_id
              report_date
              statement_id
            }
            message
            status
          }
        }
      `,
      variables: { viewAuditReportByIdId: data?.id },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.viewAuditReportById?.status === "SUCCESS") {
      return response?.data?.viewAuditReportById?.data;
    }

    if (response?.data?.viewAuditReportById?.status === "ERROR") {
      return null;
    }

    return null;
  } catch (error: any) {
    showErrorToast(error.message || "Something went wrong in API");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export interface EditAuditReportInput {
  id: any;
  company_id: any;
  bank_account_id: any;
  audit_date: any;
  nil_return: string;
  removed_attachment_ids: any;
  project_id: any;
  aud_gen_from_date: any;
  aud_gen_to_date: any;
  new_attachment_ids: any;
}

export const editAuditReportDetails = async (
  payload: EditAuditReportInput,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation EditAuditReportDetails($payload: EditAuditReportInput!) {
          editAuditReportDetails(payload: $payload) {
            data {
              audit_id
              bank_account_id
              company_id
              id
              nil_return
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
          audit_date: payload.audit_date,
          nil_return: payload.nil_return,
          removed_attachment_ids: payload?.removed_attachment_ids,
          project_id: payload?.project_id,
          aud_gen_to_date: payload?.aud_gen_to_date,
          aud_gen_from_date: payload?.aud_gen_from_date,
          new_attachment_ids: payload?.new_attachment_ids,
        },
      },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.editAuditReportDetails?.status === "SUCCESS") {
      showSuccessToast(response?.data?.editAuditReportDetails?.message);
      return response?.data?.editAuditReportDetails?.data;
    }
    if (response?.data?.editAuditReportDetails?.status === "ERROR") {
      showErrorToast(response?.data?.editAuditReportDetails?.message);
      console.error(response?.data);
      return false;
    }
    return false;
  } catch (error: any) {
    showErrorToast(error.message || "Something went wrong in API");
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};

export async function deleteAttachment(postData: any): Promise<boolean> {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation DeleteFileByIdAndType(
          $attachmentId: String!
          $attachmentType: String!
          $id: String!
        ) {
          deleteFileByIdAndType(
            attachmentId: $attachmentId
            attachmentType: $attachmentType
            id: $id
          ) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.deleteFileByIdAndType?.status === "SUCCESS") {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("Error deleting file:", error);
    return false;
  }
}

export async function getStartAuditDate(
  bankAccountId: number
): Promise<{ bank_account_id: number; start_audit_date: string } | null> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetStartAuditDate($bankAccountId: Float!) {
          getStartAuditDate(bank_account_id: $bankAccountId) {
            data {
              bank_account_id
              start_audit_date
            }
            message
            status
          }
        }
      `,
      variables: { bankAccountId },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.getStartAuditDate?.status === "SUCCESS") {
      return response?.data?.getStartAuditDate?.data;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching start audit date:", error);
    return null;
  }
}

export async function triggerAuditNotices(data: any): Promise<any> {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation TriggerAuditNotices($payload: triggerAuditNoticesInput!) {
          triggerAuditNotices(payload: $payload) {
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
    });
    const res = response?.data?.triggerAuditNotices;
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
  } catch (error) {
    console.error("Error deleting file:", error);
    return false;
  }
}

export async function GetBankAssociatedProject(data: any) {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetBankAssociatedProject($bankAccountId: Float!) {
          getBankAssociatedProject(bank_account_id: $bankAccountId) {
            message
            status
            data {
              project_description
              project_id
              project_name
            }
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });

    console.log("🚀 ~ GetBankAssociatedProject ~ response:", response);

    if (
      response &&
      response?.data?.getBankAssociatedProject?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.getBankAssociatedProject?.data;
    } else if (
      response &&
      response?.data?.getBankAssociatedProject?.status === ApiResponse.ERROR
    ) {
      return null;
    }
  } catch {
    return null;
  }
}

export const GenerateAuditReport = async (payload: any) => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation GenerateAuditReport($payload: ExportAuditReportInput!) {
          generateAuditReport(payload: $payload) {
            file {
              attachment_id
              file_name
              file_path
              file_type
            }
            message
            status
          }
        }
      `,
      variables: payload,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.generateAuditReport?.status === ApiResponse.SUCCESS) {
      return response?.data?.generateAuditReport;
    } else if (
      response?.data?.generateAuditReport?.status === ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.generateAuditReport?.message);
      return false;
    }
    return false;
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);

    return false;
  }
};
