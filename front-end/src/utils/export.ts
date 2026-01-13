import * as XLSX from "xlsx-js-style";
import "jspdf-autotable";
import jsPDF from "jspdf";
import { formatDate } from ".";
import apolloClient from "@/network/apolloClient";
import { gql } from "@apollo/client";
import { ApiResponse } from "@/shared/constant/messages";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { jwtDecode } from "jwt-decode";
import {
  ZipReader,
  BlobReader,
  ZipWriter,
  BlobWriter,
  TextReader,
} from "@zip.js/zip.js";

interface ColumnStyle {
  cellWidth: number | string; // Allow both number and string types for cellWidth
}

export async function convertJsonToExcel(
  excelData: any,
  fileNameToSave: string,
  requiredKeys: { value: string; label: string; isDate: string }[]
) {
  // Extract only the required keys from each object
  const formattedData = excelData.map((entry: any) => {
    // Use the key property from requiredKeys for value extraction
    return Object.fromEntries(
      requiredKeys.map(({ value, label, isDate = false }) => [
        label,
        isDate ? formatDate(entry[value]) : entry[value],
      ])
    );
  });

  // Create and style the Excel workbook and worksheet
  const wb = XLSX.utils.book_new();
  let headerKeys = requiredKeys.map(({ label }) => label);
  const ws = XLSX.utils.json_to_sheet(formattedData, {
    header: headerKeys, // Use names from requiredKeys
  });

  // Customize headers
  const headers = headerKeys;
  headers.forEach((header, index) => {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: index });
    ws[cellAddress].v = header; // Use original header names
    ws[cellAddress].s = { font: { bold: true } }; // Apply bold styling
  });

  // Set column widths (adjust as needed)
  ws["!cols"] = headers.map(() => ({ wch: 20 }));
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

// Function to generate and print PDF
export const generateAndPrintPDF = (
  tableData: any[],
  headerNames: string[],
  moduleName: string, // Accept the module name
  pageView?: boolean
) => {
  const doc: any = new jsPDF(pageView ? "landscape" : "portrait");

  // Define margin and calculate page width
  const margin = { top: 10, bottom: 10, left: 10, right: 10 };
  const pageWidth = doc.internal.pageSize.width - margin.left - margin.right;

  // Set max columns per page and calculate number of pages
  const maxColumnsPerPage = 5;
  const numberOfPages = Math.ceil(headerNames.length / maxColumnsPerPage);

  for (let pageIndex = 0; pageIndex < numberOfPages; pageIndex++) {
    // Calculate column range for the current page
    const startColumn = pageIndex * maxColumnsPerPage;
    const endColumn = Math.min(
      startColumn + maxColumnsPerPage,
      headerNames.length
    );

    // Calculate column width
    const currentColumnCount = endColumn - startColumn;
    const columnWidth =
      currentColumnCount > 0 ? pageWidth / currentColumnCount : 0;

    // Slice header names and set column styles
    const slicedHeaderNames = headerNames.slice(startColumn, endColumn);
    const slicedColumnStyles: { [key: number]: ColumnStyle } = {};
    slicedHeaderNames.forEach((_, index) => {
      slicedColumnStyles[index] = { cellWidth: columnWidth };
    });

    // Set font for the document
    doc.setFont("helvetica", "normal");

    // Create table with custom header background color and default body styles
    doc.autoTable({
      head: [slicedHeaderNames],
      body: tableData.map((row) => row.slice(startColumn, endColumn)),
      startY:
        margin.top +
        pageIndex * (doc.internal.pageSize.height - margin.top - margin.bottom),
      margin: margin,
      styles: {
        cellWidth: "wrap",
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [226, 59, 48], // Header background color #E23B30
        textColor: [255, 255, 255], // White text for the header
      },
      bodyStyles: {
        fillColor: [255, 255, 255], // Body background color (white)
        textColor: [0, 0, 0], // Body text color (black)
      },
      columnStyles: slicedColumnStyles,
      tableWidth: pageWidth,
      pageBreak: "auto",
    });
  }

  // doc.addFileToVFS("Roboto-Regular.ttf", BNAZANIN);
  doc.addFont("Roboto-Regular.ttf", "Roboto-Regular", "normal");
  doc.setFont("Roboto-Regular"); // set font
  // Set PDF properties
  doc.setProperties({ title: moduleName });

  // Save the PDF with the specified file name
  const fileName = `${moduleName}.pdf`;
  const blob = doc.output("blob");
  const blobURL = URL.createObjectURL(blob);

  const pdfWindow = window.open(blobURL);
  if (pdfWindow) {
    setTimeout(() => {
      pdfWindow.document.title = moduleName;
    }, 100);
  }

  // Save the PDF
  doc.save(fileName);
};

//  mutation GenerateSignedUrl($payload: ExportExcelDataInput!) {
//   generateSignedUrl(payload: $payload) {
//     message
//     status
//   }
export const GenerateSignedUrl = async (data: any) => {
  try {
    let response = await apolloClient.query({
      query: gql`
        mutation GenerateSignedUrl($payload: ExportExcelDataInput!) {
          generateSignedUrl(payload: $payload) {
            message
            status
          }
        }
      `,
      variables: { payload: data },
    });
    if (response?.data?.generateSignedUrl?.status === ApiResponse.SUCCESS) {
      return response?.data?.generateSignedUrl?.message;
    }
    if (response?.data?.generateSignedUrl?.status === ApiResponse.ERROR) {
      return "";
    }
  } catch {
    showErrorToast(ApiResponse.SOMETHING_WENT_WRONG);
    return "";
  }
};

export async function GenerateABAfiles(data: any) {
  try {
    let response = await apolloClient.query({
      query: gql`
        query GenerateABAfiles($payload: ListSubPaymentsInput!) {
          generateABAfiles(payload: $payload) {
            message
            status
            data {
              attachment_type
              file_name
              file_path
              file_type
              id
              aba_message
              bank_account_id
              company_id
              notice_trigger
            }
          }
        }
      `,
      variables: { payload: data },
    });

    const abaFileData = response?.data?.generateABAfiles;

    if (abaFileData?.status === ApiResponse.SUCCESS) {
      if (abaFileData?.data?.file_path) {
        showSuccessToast(
          abaFileData?.data?.aba_message || abaFileData?.message
        );
      }

      return abaFileData?.data;
    }
    if (abaFileData?.status === ApiResponse.ERROR) {
      return "";
    }
  } catch {
    showErrorToast(ApiResponse.SOMETHING_WENT_WRONG);
    return "";
  }
}

export const downloadExcelFileFromAPI = async (signedUrl: string) => {
  try {
    let url = '/files/excel';
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${signedUrl}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to generate Excel file");
    }

    const decodedData: any = jwtDecode(signedUrl);

    const blob = await response.blob();

    const fileURL = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = fileURL;
    a.download = decodedData?.fileName || "data.xlsx"; // Provide the appropriate filename
    document.body.appendChild(a);
    a.click();
    a.remove(); // Clean up
  } catch (error: any) {
    showErrorToast(
      error.message || "An error occurred while downloading the file"
    );
  }
};

export const downloadAuditZipFromAPI = async (
  signedUrl: string,
  password: string
) => {
  try {
    const url = '/files/auditReport';
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${signedUrl}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to generate ZIP file");
    }

    const decodedData: any = jwtDecode(signedUrl);
    const blob = await response.blob();
    await passwordProtectedZip(blob, decodedData?.fileName, password);
  } catch (error: any) {
    showErrorToast(
      error.message || "An error occurred while downloading the file"
    );
  }
};

export const downloadAuditZipFromPath = async (
  path: string,
  fileName: string,
  password: string
) => {
  try {
    const response = await fetch(path);

    if (!response.ok) {
      throw new Error("Failed to generate ZIP file");
    }
    const blob = await response.blob();
    await passwordProtectedZip(blob, fileName, password);
  } catch (error: any) {
    showErrorToast(
      error.message || "An error occurred while downloading the file"
    );
  }
};

export const getPDFUrl = async (clientId: any, payload: any) => {
  try {
    let url =
      `${process.env.NEXT_PUBLIC_WEB_SOCKET_BASED_PDF_FILE_DOWNLOAD_TO_GET_URL}` +
      "clientId=" +
      clientId;
    const response: any = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    showSuccessToast(data.message);
  } catch (error: any) {
    showSuccessToast(error);
  }
};

async function passwordProtectedZip(
  originalZipBlob: Blob,
  fileName: string,
  password: string
) {
  const zipReader = new ZipReader(new BlobReader(originalZipBlob));
  const entries = await zipReader.getEntries();
  const writer = new BlobWriter("application/zip");
  const zipWriter = new ZipWriter(writer, {
    password: password?.toString()?.slice(-4),
    encryptionStrength: 3,
  });
  for (const entry of entries) {
    if (!entry.directory) {
      const entryData = await entry.getData(new BlobWriter());
      await zipWriter.add(entry.filename, new BlobReader(entryData));
    }
  }
  const protectedInnerZipBlob = await zipWriter.close();
  const outerWriter = new BlobWriter("application/zip");
  const outerZipWriter = new ZipWriter(outerWriter);

  await outerZipWriter.add(
    "protected-files.zip",
    new BlobReader(protectedInnerZipBlob)
  );

  await outerZipWriter.add(
    "password-hint.txt",
    new TextReader("Last 4 digits of the bank account number!")
  );
  const final = await outerZipWriter.close();

  const fileURL = URL.createObjectURL(final);
  const a = document.createElement("a");
  a.href = fileURL;
  a.download = fileName || "data.zip";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function downloadABAFile(file: any) {
  try {
    const res = await fetch(
      `/api/proxy-download?url=${encodeURIComponent(
        file?.file_path
      )}&filename=${encodeURIComponent(file?.file_name)}`
    );
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = file?.file_name;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error("Download error:", error);
  }
}
