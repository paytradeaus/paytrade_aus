import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import {
  AuditReportType,
  ReconciliationReportType,
} from "./trustAccounting.types";

// Define the function to fetch audit reports
export const getAllAuditReportList = async (
  data: {
    company_id: number;
    bank_account_id?: number | null;
    account_type?: string | null;
    date_filter?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    timezone?: string | null;
    page_number?: number | null;
    page_size?: any;
  },
  setLoading?: (loading: boolean) => void
): Promise<{ total_count: number; report_list: AuditReportType[] } | null> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetAllAuditReportList($payload: GetAllAuditReportInput!) {
          getAllAuditReportList(payload: $payload) {
            data {
              report_list {
                account_name
                account_type
                account_number
                attachment_ids
                audit_date
                audit_id
                aud_gen_from_date
                aud_gen_to_date
                bank_account_id
                company_id
                project_id
                file_details {
                  attachment_type
                  file
                  file_name
                  file_path
                  file_type
                  id
                }
                id
                nil_return
                report_date
                statement_id
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: {
        payload: {
          company_id: data.company_id,
          bank_account_id: data.bank_account_id || null,
          account_type: data.account_type || null,
          date_filter: data.date_filter || null,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          timezone: data.timezone || null,
          page_number: data.page_number || null,
          page_size: data.page_size || null,
        },
      },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.getAllAuditReportList?.status === ApiResponse.SUCCESS) {
      return response.data.getAllAuditReportList.data;
    } else {
      console.error("Error:", response?.data?.getAllAuditReportList?.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    if (setLoading) setLoading(false);
  }
};

export const getAllReconciliationReportList = async (
  data: any,
  setLoading?: Function
): Promise<
  { total_count: number; report_list: ReconciliationReportType[] } | any
> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetAllReconciliationReportList(
          $payload: GetAllReconciliationReportInput!
        ) {
          getAllReconciliationReportList(payload: $payload) {
            data {
              report_list {
                account_ledger_balance
                account_name
                adjustment_comment
                adjustments
                bank_account_id
                bank_statement_balance
                company_id
                deposit_withdrawal_balance
                expected_balance
                id
                month_end_date
                reconcile_status
                report_date
                report_id
                report_status
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: {
        payload: {
          ...data,
        },
      },
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.getAllReconciliationReportList?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.getAllReconciliationReportList?.data;
    }
    if (
      response?.data?.getAllReconciliationReportList?.status ===
      ApiResponse.ERROR
    ) {
      return null;
    }
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const deleteReconciliationReportDetails = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation DeleteReconciliationReportDetails($id: String!) {
          deleteReconciliationReportDetails(id: $id) {
            data {
              company_id
              id
              report_id
              report_status
            }
            message
            status
          }
        }
      `,
      variables: {
        company_id: data?.company_id,
        id: data?.id,
        report_id: data?.report_id,
        report_status: data?.report_status,
      },
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.deleteReconciliationReportDetails?.status === "SUCCESS"
    ) {
      showSuccessToast(
        response?.data?.deleteReconciliationReportDetails?.message
      );
      return true;
    } else if (
      response?.data?.deleteReconciliationReportDetails?.status === "ERROR"
    ) {
      showErrorToast(
        response?.data?.deleteReconciliationReportDetails?.message
      );
      console.error(response?.data?.deleteReconciliationReportDetails?.message);
      return false;
    }

    return false;
  } catch (error: any) {
    showErrorToast(error.message || "Something went wrong in API");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const deleteAuditReportDetails = async (
  data: { id: string; company_id: number },
  setLoading?: (loading: boolean) => void
): Promise<boolean | null> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation DeleteAuditReportDetails($payload: DeleteAuditReportInput!) {
          deleteAuditReportDetails(payload: $payload) {
            data {
              id
              audit_id
              company_id
            }
            message
            status
          }
        }
      `,
      variables: {
        payload: {
          id: data?.id,
          company_id: data?.company_id,
        },
      },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.deleteAuditReportDetails?.status === "SUCCESS") {
      showSuccessToast(response?.data?.deleteAuditReportDetails?.message);
      return true;
    } else if (response?.data?.deleteAuditReportDetails?.status === "ERROR") {
      showErrorToast(response?.data?.deleteAuditReportDetails?.message);
      console.error(response?.data?.deleteAuditReportDetails?.message);
      return false;
    }

    return false;
  } catch (error: any) {
    showErrorToast(error.message || "Something went wrong in API");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
