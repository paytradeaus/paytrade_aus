import { gql } from "@apollo/client";
import { toast } from "@/app/Toaster";
import { client } from "@/app/api/adminAPIs/adminAPIs";
import jsPDF from "jspdf";

export interface ReconciliationReportType {
  account_ledger_balance: string;
  account_name: string;
  adjustment_comment: string;
  adjustments: string;
  bank_account_id: string;
  bank_statement_balance: string;
  company_id: string;
  deposit_withdrawal_balance: string;
  expected_balance: string;
  id: string;
  month_end_date: string;
  reconcile_status: string;
  report_date: string;
  report_id: string;
  report_status: string;
}

export const getAllReconciliationReportList = async (
  data: any,
  setLoading?: Function
): Promise<
  { total_count: number; report_list: ReconciliationReportType[] } | any
> => {
  try {
    const response = await client.query({
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
          company_id: data?.company_id,
          bank_account_id: data?.bank_account_id || null,
          account_type: data?.account_type || null,
          date_filter: data?.date_filter || null,
          start_date: data?.start_date || null,
          end_date: data?.end_date || null,
          timezone: data?.timezone || null,
          page_number: data?.page_number || null,
          page_size: data?.page_size || null,
          isArchived: data?.isArchived || null,
        },
      },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.getAllReconciliationReportList?.status === "SUCCESS") {
      return response?.data?.getAllReconciliationReportList?.data;
    }
    if (response?.data?.getAllReconciliationReportList?.status === "ERROR") {
      return null;
    }
  } catch (error: any) {
    toast.error(error.message || "Something went wrong in the API");
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
    const response = await client.mutate({
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
      toast.success(response?.data?.deleteReconciliationReportDetails?.message);
      return true;
    } else if (
      response?.data?.deleteReconciliationReportDetails?.status === "ERROR"
    ) {
      toast.error(response?.data?.deleteReconciliationReportDetails?.message);
      console.error(response?.data?.deleteReconciliationReportDetails?.message);
      return false;
    }

    return false;
  } catch (error: any) {
    toast.error(error.message || "Something went wrong in API");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const generateAndPrintPDF = (
  tableData: any[],
  headerNames: string[],
  fileName: string,
  pageView?: boolean
) => {
  const doc: any = new jsPDF(pageView ? "landscape" : "portrait");

  // Define the column styles, with specific columns aligned to the right
  const columnStyles = {
    2: { halign: "right" },
    3: { halign: "right" },
    5: { halign: "right" },
    6: { halign: "right" },
    7: { halign: "right" },
  };

  // Define header styles with specific headers aligned to the right
  const headStyles = {
    2: { halign: "right" },
    3: { halign: "right" },
    5: { halign: "right" },
    6: { halign: "right" },
    7: { halign: "right" },
  };

  (doc as any).autoTable({
    head: [headerNames],
    body: tableData,
    columnStyles: columnStyles, // Apply custom column styles
    headStyles: headStyles, // Apply custom header styles
    styles: {
      halign: "left", // Default alignment for non-specified columns
    },
  });

  doc.setProperties({ title: fileName ?? "pdf file" });

  // Open the saved PDF for printing
  window.open(doc.output("bloburl", "_blank"));
};
