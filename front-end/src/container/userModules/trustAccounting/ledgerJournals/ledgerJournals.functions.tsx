import { gql } from "@apollo/client";
import { toast } from "@/app/Toaster";
import { client } from "@/app/api/adminAPIs/adminAPIs";
import { SOMETHING_WENT_WRONG } from "@/common/constants/messages";
import jsPDF from "jspdf";
import html2pdf from "html2pdf.js";
// import * as XLSX from "xlsx";
import * as XLSX from "xlsx-js-style";
import "jspdf-autotable";
import { format } from "date-fns";
import { CellHookData } from "jspdf-autotable";
export interface LedgerJournalsType {
  audit_id: string;
  accounts: any;
  account_name: string;
  account_type: string;
  search: number;
  credit: number;
  debit: number;
  date: any;
  activity_id: number;
  description: string;
  journal_description: string;
  total_credit: number;
  total_debit: number;
  total_count: number;
}

interface HeaderBase {
  value: string;
  label: string;
}

interface MergedHeader extends HeaderBase {
  colspan: number;
  align: string;
}
interface GeneratePDFProps {
  data: any[];
  // headerNames: string[];
  dateText: string;
  fileName: string;
  autoPrint: boolean;
  columnStyles: { [key: number]: { halign: string } };
  p0: { headerBorder: boolean };
  headerText?: string; // Make headerText optional
}
type Header = {
  value: string;
  label: string;
  colspan?: number;
  align?: string;
};
export const getLedgerJournalServices = async (
  data: any,
  setLoading?: Function
): Promise<
  { total_count: number; ledger_journals_list: LedgerJournalsType[] } | any
> => {
  try {
    const response = await client.query({
      query: gql`
        query FetchLedgerJournalsByAccountId(
          $payload: FetchLedgerJournalsByAccountIdInput!
        ) {
          fetchLedgerJournalsByAccountId(payload: $payload) {
            data {
              ledger_journals_list {
                accounts {
                  audit_id
                  description
                  account_name
                  credit
                  debit
                }
                journal_number
                date
                journal_description
                total_credit
                total_debit
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
          search: data?.search,
          start_date: format(new Date(data?.start_date), "yyyy-MM-dd"),
          end_date: format(new Date(data?.end_date), "yyyy-MM-dd"),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.fetchLedgerJournalsByAccountId?.status === "SUCCESS") {
      return response?.data?.fetchLedgerJournalsByAccountId?.data;
    }
    if (response?.data?.fetchLedgerJournalsByAccountId?.status === "ERROR") {
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

export const generatePDF = ({
  data,
  fileName,
  autoPrint,
  columnStyles, // Ensure columnStyles is passed correctly
  headerText,
  logo,
  selectedAccountName,
  headerNames,
}: {
  data: any[];
  fileName: string;
  autoPrint: boolean;
  columnStyles: { [key: number]: { halign: string } }; // Correct type for columnStyles
  headerText?: string;
  logo?: string;
  selectedAccountName: string;
  headerNames: string[];
}) => {
  // Make header names bold
  const boldHeaderNames = headerNames.map((name) =>
    name ? `<b>${name}</b>` : "<b></b>"
  );
  const dummyimage =
    "data:image/png;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<Bol>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";
  const generateHTML = () => {
    let htmlContent = `
    <div style="font-family: Helvetica, Arial, sans-serif; font-size: 11px; line-height: 1.5; color: #000; padding: 10px;">
      <div style="margin-bottom: 20px;">
  `;

    // Add logo and header
    if (logo) {
      htmlContent += `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <img src="${dummyimage}" alt="Logo" style="width: 100px; height: auto;" />
        <h4 style="text-align: right; font-size: 14px; font-weight: bold;">TRUST ACCOUNTING - JOURNALS</h4>
      </div>
      <hr style="border: 0.5px solid #000; margin: 5px 0;">
    `;
      console.log(logo, "logo");
    } else {
      console.log(logo, "logo1");
    }
    // Add account name and header details
    if (selectedAccountName || headerText) {
      htmlContent += `
      <div style="background-color: #f8f8f8; padding: 10px; margin-top: 10px; border-radius: 4px;">
        ${
          selectedAccountName
            ? `<div><strong>Account:</strong> ${selectedAccountName}</div>`
            : ""
        }
        ${headerText ? `<div>${headerText.replace(/\n/g, "<br>")}</div>` : ""}
      </div>
    `;
    }

    // Add table without borders
    htmlContent += `
  <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
    <!-- Header Section -->
    <thead>
      <tr style="background-color: #f0f0f0; font-weight: bold; text-align: left;">
        ${boldHeaderNames
          .map((name, index) => {
            // Apply styles only for the specific columns in the header
            const isHeaderColumn = [
              "Account",
              "Audit ID",
              "Debit",
              "Credit",
            ].includes(name);

            const headerTextColor = "#FF5733"; // Set custom color for header names

            return `
              <th style="padding: 8px; color: ${headerTextColor}; ${
              isHeaderColumn ? "" : ""
            }">${name}</th>
            `;
          })
          .join("")}
      </tr>
    </thead>

    <!-- Body Section -->
    <tbody>
      ${data
        .map((row: any) => {
          return `
            <tr>
              ${Object.keys(row)
                .map((key, index) => {
                  const cellValue =
                    typeof row[key] === "number"
                      ? row[key].toFixed(2)
                      : row[key] || "";

                  // Apply styles only for the specific columns in the body
                  const isDataColumn = [
                    "Account",
                    "Audit ID",
                    "Debit",
                    "Credit",
                  ].includes(boldHeaderNames[index]);

                  return `
                    <td style="padding: 8px; text-align:left; ${
                      columnStyles[index]?.halign || "left"
                    }; ${isDataColumn ? "" : ""}">${cellValue}</td>
                  `;
                })
                .join("")}
            </tr>
          `;
        })
        .join("")}
    </tbody>
  </table>
`;

    // Pagination footer
    htmlContent += `
    <div style="text-align: center; margin-top: 10px; font-size: 10px;">
      Page <span class="pageNumber"></span> of <span class="totalPages"></span>
    </div>
  </div>
  `;

    return htmlContent;
  };

  const htmlContent = generateHTML();

  // Convert HTML to PDF
  const element = document.createElement("div");
  element.innerHTML = htmlContent;
  const options = {
    margin: [10, 15, 10, 15],
    filename: `${fileName || "document"}.pdf`,
    html2canvas: { scale: 2 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["css", "legacy"] },
  };

  html2pdf()
    .set(options)
    .from(htmlContent)
    .toPdf()
    .get("pdf")
    .then((pdf: any) => {
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        if (i > 1) {
          pdf.setMargins(20, 10, 20, 10); // Add top and bottom margins for subsequent pages
        }
        pdf.text(
          `Page ${i} of ${pageCount}`,
          pdf.internal.pageSize.getWidth() / 2,
          pdf.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }
    })
    .save();

  // Auto-print functionality
  if (autoPrint) {
    html2pdf()
      .set(options)
      .from(element)
      .toPdf()
      .get("pdf")
      .then((pdf: any) => pdf.autoPrint())
      .output("blob")
      .then((blob: any) => {
        window.open(URL.createObjectURL(blob), "_blank");
      });
  }
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
