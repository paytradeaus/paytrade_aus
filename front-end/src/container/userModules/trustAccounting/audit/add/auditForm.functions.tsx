import { gql } from "@apollo/client";
import { toast } from "@/app/Toaster";
import { client } from "@/app/api/adminAPIs/adminAPIs";

export interface CheckAuditReportExistenceInput {
  bank_account_id: number;
  month_end_date: any;
  timezone: string;
}

export const checkAuditReportExistence = async (
  data: CheckAuditReportExistenceInput,
  setLoading?: Function
): Promise<any> => {
  try {
    setLoading && setLoading(true);

    const response = await client.query({
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

    const response = await client.query({
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
}): Promise<any> => {
  try {
    const response = await client.mutate({
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
      toast.success(result?.message);
      return result?.data;
    } else if (result?.status === "ERROR") {
      toast.error(result?.message);
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
    const response = await client.query({
      query: gql`
        query ViewAuditReportById($id: String!) {
          viewAuditReportById(id: $id) {
            data {
              attachment_id
              audit_date
              audit_id
              bank_account_id
              account_name
              company_id
              file
              file_name
              file_path
              file_type
              id
              nil_return
              report_date
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

    if (response?.data?.viewAuditReportById?.status === "SUCCESS") {
      return response?.data?.viewAuditReportById?.data;
    }

    if (response?.data?.viewAuditReportById?.status === "ERROR") {
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

export interface EditAuditReportInput {
  id: any;
  company_id: any;
  bank_account_id: any;
  audit_date: any;
  nil_return: string;
}

export const editAuditReportDetails = async (
  payload: EditAuditReportInput,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
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
        },
      },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.editAuditReportDetails?.status === "SUCCESS") {
      toast.success(response?.data?.editAuditReportDetails?.message);
      return response?.data?.editAuditReportDetails?.data;
    }
    if (response?.data?.editAuditReportDetails?.status === "ERROR") {
      toast.error(response?.data?.editAuditReportDetails?.message);
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

export async function deleteAttachment(postData: any): Promise<boolean> {
  try {
    const response = await client.mutate({
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

export async function triggerAuditNotices(data: any): Promise<any> {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation Mutation($payload: triggerAuditNoticesInput!) {
          triggerAuditNotices(payload: $payload) {
            message
            status
          }
        }
      `,
      variables: {
        payload: data,
      },
    });

    if (response?.data?.triggerAuditNotices?.status === "SUCCESS") {
      toast.success(response?.data?.triggerAuditNotices?.message);
      return true;
    }
    if (response?.data?.triggerAuditNotices?.status === "ERROR") {
      toast.error(response?.data?.triggerAuditNotices?.message);
      return false;
    }
  } catch (error) {
    console.error("Error deleting file:", error);
    return false;
  }
}
