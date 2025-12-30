import { gql } from "@apollo/client";
import { toast } from "@/app/Toaster";
import { client } from "@/app/api/adminAPIs/adminAPIs";

export interface AuditReportType {
  audit_date: string;
  account_name: string;
  audit_id: number;
  bank_account_id: number;
  company_id: number;
  id: string;
  nil_return: string;
  report_date: string;
  statement_id: number;
}

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
    const response = await client.query({
      query: gql`
        query GetAllAuditReportList($payload: GetAllAuditReportInput!) {
          getAllAuditReportList(payload: $payload) {
            data {
              report_list {
                attachment_id
                audit_date
                audit_id
                bank_account_id
                account_type
                company_id
                file
                file_name
                file_path
                file_type
                id
                nil_return
                report_date
                statement_id
                account_name
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

    if (response?.data?.getAllAuditReportList?.status === "SUCCESS") {
      return response.data.getAllAuditReportList.data;
    } else {
      console.error("Error:", response?.data?.getAllAuditReportList?.message);
      return null;
    }
  } catch (error: any) {
    toast.error(error.message || "Something went wrong in the API");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    if (setLoading) setLoading(false);
  }
};
