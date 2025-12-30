import { gql } from "@apollo/client";
import { toast } from "react-toastify";
import { client } from "@/app/api/adminAPIs/adminAPIs";
import * as XLSX from "xlsx-js-style";

export interface LedgerTrialBalanceType {
  account_name: string;
  beneficiary_type: string;
  closing_balance: number;
  transaction_account_id: number;
}

export const getLedgerTrialBalanceServices = async (
  data: any,
  setLoading?: Function
): Promise<
  | {
      total_closing_balance: number;
      trial_balance_list: LedgerTrialBalanceType[];
    }
  | any
> => {
  try {
    setLoading && setLoading(true);

    const response = await client.query({
      query: gql`
        query FetchLedgerTrialBalanceByAccountId(
          $payload: FetchLedgerTrialBalanceByAccountIdInput!
        ) {
          fetchLedgerTrialBalanceByAccountId(payload: $payload) {
            data {
              total_closing_balance
              trial_balance_list {
                account_name
                beneficiary_type
                closing_balance
                transaction_account_id
              }
            }
            message
            status
          }
        }
      `,
      variables: {
        payload: {
          bank_account_id: data?.bank_account_id,
          date_filter: data?.date_filter,
          start_date: data?.start_date,
          timezone: data?.timezone,
        },
      },
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.fetchLedgerTrialBalanceByAccountId?.status === "SUCCESS"
    ) {
      return response?.data?.fetchLedgerTrialBalanceByAccountId?.data;
    }

    if (
      response?.data?.fetchLedgerTrialBalanceByAccountId?.status === "ERROR"
    ) {
      toast.error(
        response?.data?.fetchLedgerTrialBalanceByAccountId?.message ||
          "Error fetching ledger trial balance"
      );
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

export async function convertJsonToHeaderExcel(
  excelData: any[],
  fileNameToSave: string,
  requiredKeys: { value: string; label: string }[],
  headerTitle: string // Add a parameter for the header title
) {
  // Extract only the required keys from each object
  const formattedData = excelData.map((entry) => {
    return Object.fromEntries(
      requiredKeys.map(({ value, label }) => [label, entry[value]])
    );
  });

  // Create and style the Excel workbook and worksheet
  const wb = XLSX.utils.book_new();
  let headerKeys = requiredKeys.map(({ label }) => label);

  // Insert the header title row before the actual data
  const wsData = [
    [headerTitle], // Title row
    [], // Empty row for spacing
    headerKeys, // Header row
    ...formattedData.map((entry) => Object.values(entry)), // Data rows
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData); // Use aoa_to_sheet for array of arrays

  // Customize title and headers
  const titleCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
  ws[titleCell].s = { font: { bold: true, sz: 12 } }; // Bold and larger font for the title

  // Set column widths (adjust as needed)
  ws["!cols"] = headerKeys.map(() => ({ wch: 20 }));

  XLSX.utils.book_append_sheet(wb, ws, "Sheet1"); // Add the worksheet to the workbook

  // Create file blob and trigger download
  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileNameToSave;
  link.click();
}
