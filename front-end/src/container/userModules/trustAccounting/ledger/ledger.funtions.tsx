import { gql } from "@apollo/client";
import { toast } from "@/app/Toaster";
import { client } from "@/app/api/adminAPIs/adminAPIs";
import { SOMETHING_WENT_WRONG } from "@/common/constants/messages";
import jsPDF from "jspdf";
import { format } from "date-fns";
import * as XLSX from "xlsx-js-style";
interface HeaderBase {
  value: string;
  label: string;
}

interface MergedHeader extends HeaderBase {
  colspan: number;
  align: string;
}

type Header = {
  value: string;
  label: string;
  colspan?: number;
  align?: string;
};
export interface LedgerType {
  entries: any;
  date: any;
  account_name: string;
  account_type: string;
  activity_id: number;
  balance_amount: number;
  bank_account_id: number;
  beneficiary_type: string;
  contract_id: number;
  credit_amount: number;
  debit_amount: number;
  journal_date: any;
  journal_description: string;
  journal_number: string;
  journal_system_ref: number;
  project_id: number;
  supplier_id: number;
  transaction_account_id: number;
  net_movement: number;
  total_credit_amount: number;
  total_debit_amount: number;
  credit_net_movement: number;
  debit_net_movement: number;
}

export const getLedgerServices = async (
  data: any,
  setLoading?: Function
): Promise<{ total_count: number; grid_entries: LedgerType[] } | any> => {
  try {
    const response = await client.query({
      query: gql`
        query FetchAccountLedgerByAccountId(
          $payload: FetchAccountLedgerByAccountIdInput!
        ) {
          fetchAccountLedgerByAccountId(payload: $payload) {
            data {
              grid_entries {
                account_name
                credit_net_movement
                debit_net_movement
                entries {
                  account_name
                  audit_id
                  balance_amount
                  bank_account_id
                  beneficiary_type
                  company_id
                  contract_id
                  credit_amount
                  debit_amount
                  id
                  journal_date
                  journal_description
                  journal_number
                  journal_system_ref
                  project_id
                  supplier_id
                  transaction_account_id
                }
                net_movement
                opening_balance
                total_credit_amount
                total_debit_amount
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
          bank_account_id: data?.bank_account_id,
          date_filter: data?.date_filter,
          page_number: data?.page_number,
          // page_size: data?.page_size,
          start_date: format(new Date(data?.start_date), "yyyy-MM-dd"),
          end_date: format(new Date(data?.end_date), "yyyy-MM-dd"),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.fetchAccountLedgerByAccountId?.status === "SUCCESS") {
      return response?.data?.fetchAccountLedgerByAccountId?.data;
    }
    if (response?.data?.fetchAccountLedgerByAccountId?.status === "ERROR") {
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

export const generatePDF = (
  data: { row: any[]; bold: boolean; color: number[] | null }[], // Added color in data
  headerNames: string[],
  fileName: string,
  autoPrint: boolean,
  columnStyles: { [key: number]: { halign: string } },
  headerText: string
) => {
  const doc = new jsPDF();

  // Split header text into lines and set up initial Y position
  const headerLines = headerText.split("\n");
  const hasDateRange = headerText.includes("From") && headerText.includes("to");
  const lineHeight = hasDateRange ? 9 : 9;
  let yOffset = 11;

  // Draw header text at the top
  headerLines.forEach((line) => {
    const textWidth = doc.getTextWidth(line);
    const pageWidth = doc.internal.pageSize.width;
    const xOffset = (pageWidth - textWidth) / 2;
    doc.text(line, xOffset, yOffset);
    yOffset += lineHeight;
  });

  // Draw table with custom header line below the header cells
  doc.autoTable({
    startY: yOffset + 5, // Start table a bit lower than the header text
    head: [headerNames],
    body: data.map((item) => item.row),
    styles: {
      fontSize: 10,
      cellPadding: 2,
      halign: "center",
      fillColor: false, // Transparent header background
    },
    headStyles: {
      fillColor: [255, 255, 255], // Transparent background color
      textColor: 0,
      lineWidth: 0, // Border for header cells
      lineColor: [0, 0, 0],
    },
    columnStyles: columnStyles,
    // Overwriting the didParseCell hook to apply bold style and color to the 0th index row
    didParseCell: (hookData: any) => {
      if (hookData.row.bold) {
        // Apply bold font style to the row if the bold flag is true
        hookData.cell.styles.fontStyle = "bold";
      }

      // Check for custom color flag
      if (hookData.row.color) {
        hookData.cell.styles.textColor = hookData.row.color; // Set custom text color
      }
    },
    didDrawCell: (data: any) => {
      // Draw a bottom border for the header row
      if (data.row.section === "head") {
        doc.setDrawColor(0, 0, 0); // Black color for border
        doc.setLineWidth(0.2);
        doc.line(
          data.cell.x,
          data.cell.y + data.cell.height,
          data.cell.x + data.cell.width,
          data.cell.y + data.cell.height
        );
      }
    },
    didDrawPage: (data: any) => {
      const pageHeight = doc.internal.pageSize.height;
      // Draw bottom border on each page
      // doc.line(10, pageHeight - 10, pageWidth - 10, pageHeight - 10);
    },
    theme: "plain", // Prevent styles from overriding custom head rendering
    tableLineColor: 0,
    tableLineWidth: 0.2,
  });

  // Create Blob and open in new window
  const pdfBlob = doc.output("blob");
  window.open(URL.createObjectURL(pdfBlob), "_blank");
};

export const convertJsonToViewExcel = (
  data: any[],
  fileName: string,
  columnNames: { value: string; label: string }[],
  additionalHeaders?: Header[] // Optional parameter for additional headers
) => {
  const wb = XLSX.utils.book_new();
  const wsData: any[][] = [];
  const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet([]);

  // Define styles
  const boldStyle = { font: { bold: true } };

  // Add additional header rows if provided
  if (additionalHeaders) {
    additionalHeaders.forEach((header, index) => {
      if ("colspan" in header) {
        // For merged header
        const colspan = header.colspan ?? columnNames.length; // Default to columnNames length if not provided
        const value = header.value;
        const align = header.align ?? "center"; // Default alignment if not provided

        // Add row with merged cell
        wsData.push(new Array(colspan).fill(value));

        // Define merge range
        const startCell = { r: index, c: 0 }; // Start at the first column
        const endCell = { r: index, c: colspan - 1 }; // End at the last column of the merge range
        ws["!merges"] = (ws["!merges"] || []).concat([
          { s: startCell, e: endCell },
        ]);

        // Apply cell style for merged header
        const cellAddress = XLSX.utils.encode_cell({ c: 0, r: index });
        // ws[cellAddress].s = { font: { bold: true, width: 100 } };
        ws[cellAddress] = {
          v: value,
          s: {
            ...boldStyle,
            alignment: { horizontal: align, vertical: "center" },
          },
        };
      }
    });
  }

  // Add column headers
  const columnHeaderRow = columnNames.map((col) => col.label);
  wsData.push(columnHeaderRow);

  // Add data rows
  data.forEach((row) => {
    wsData.push(columnNames.map((col) => row[col.value] || ""));
  });

  // Add data to worksheet
  XLSX.utils.sheet_add_aoa(ws, wsData, { origin: "A1" }); // Specify origin to start from A1

  // Apply bold style to the first two rows (headers)
  const boldCells = ["A1", "A2", "B2", "C2", "D2", "E2", "F2", "G2", "H2"];
  boldCells.forEach((cell) => {
    ws[cell] = {
      ...(ws[cell] || {}),
      s: boldStyle,
    };
  });

  // Apply column widths
  ws["!cols"] = columnNames.map(() => ({ wch: 20 })); // Adjust width as needed

  // Create worksheet from data
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

  // Write the file
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};
