import { deleteCookie, getCookie } from "cookies-next";
import { format } from "date-fns";
import {
  CURRENCY_SYMBOL,
  DD_MM_YYYY,
  DECIMAL_WITH_DOLLAR,
} from "./constants/general";
import * as XLSX from "xlsx-js-style";
import { jwtDecode } from "jwt-decode";
import jsPDF from "jspdf";
import "jspdf-autotable"; // import jspdf-autotable plugin
import { Buffer } from "buffer";
import { ApplicationURLS } from "./applicationURLS";
import { useDispatch } from "react-redux";
import { setAuditDetails } from "@/redux/slices/subscribeRouteBackDetails";
interface ColumnStyle {
  cellWidth: number | string; // Allow both number and string types for cellWidth
}
function getCurrentUtcTime() {
  return new Date().toISOString().replace("T", " ").split(".")[0] + " UTC";
}

function clearALLCookies() {
  deleteCookie("accessVerification");
  deleteCookie("userMail");
  deleteCookie("accessToken");
  deleteCookie("userRole");
  deleteCookie("companyId");
  deleteCookie("retentionAmount");
  deleteCookie("UserCompanyId");
  deleteCookie("UserMode");
  deleteCookie("ProfileType");
  deleteCookie("PaymentType");
  deleteCookie("bankId");
  deleteCookie("compId");
  deleteCookie("userMode");
  localStorage.clear();
  sessionStorage.clear();
}

function formatDate(value: any, formatType: string = DD_MM_YYYY) {
  return format(new Date(value), formatType);
}

function getDecryptedToken() {
  // Extract the authentication token from cookies
  const authToken: any = localStorage.getItem("accessToken");
  // Decrypt the authentication token
  return authToken ? jwtDecode(authToken) : "";
}

function findSelectedOptions(options: any[], existingValue: string) {
  return options.find((x: any) => x?.value == existingValue) ?? null;
}

function convertPositiveDecimalTwoDigit(
  value: number,
  isCommaRequired = false
) {
  if (isCommaRequired)
    return value
      ? Math.abs(value)
          .toFixed(2)
          .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
      : null;

  return value ? Math.abs(value).toFixed(2) : null;
}

function upperCaseFirstLetter(value: string) {
  // capitalize the first letter
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function mapDropdownOptions(
  arrOptions: any[],
  labelValue: string,
  dataValue: string
) {
  if (arrOptions?.length > 0) {
    return arrOptions.map((data: any) => {
      return { label: data?.[labelValue], value: data?.[dataValue] };
    });
  } else {
    return [];
  }
}

function replaceDollarSymbol(value: any) {
  return value ? value?.toString().replace(/\$\s*/, "") : "";
}

function convertCanvasToFile(selectedCanvas: any, selectedImage: any) {
  return new Promise((resolve, reject) => {
    selectedCanvas.current.toBlob((blob: any) => {
      if (!blob) {
        console.error("Canvas is empty");
        return;
      }
      const file: any = new File([blob], selectedImage[0]?.name, {
        type: selectedImage[0]?.type,
      });

      resolve(file);
    }, "image/jpeg");
  });
}

async function AppendSymbolWithCurrentValue(
  value: any,
  fieldName: string,
  formik: any
) {
  const charIndex = value.indexOf(CURRENCY_SYMBOL);

  if (value.trim() === CURRENCY_SYMBOL) {
    formik.setFieldValue(fieldName, "");
  } else if (DECIMAL_WITH_DOLLAR.test(value) || value === CURRENCY_SYMBOL) {
    await formik.setFieldValue(
      fieldName,
      charIndex == -1 ? `$ ${value}` : value
    );
  }
}

function getCompanyIdFromCookies() {
  return Number(getCookie("companyId")) || "";
}

//Returns type of subscription plan of current company
function getSubscriptionType(decodeTokenData: any, selectedCompanyId: any) {
  if (decodeTokenData && selectedCompanyId) {
    // Filter to get the relevant company-specific role based on companyId
    const newData = decodeTokenData?.companySpecificRoles?.find(
      (x: { companyId: number }) =>
        String(x.companyId) === String(selectedCompanyId)
    );

    // Check if the company role exists and contains subscription data
    const currentPlanName = newData?.subscription?.plan_name;

    return currentPlanName || "Basic"; // Assuming setPlanName exists to store the plan name
  }
}

export {
  getSubscriptionType,
  getCompanyIdFromCookies,
  AppendSymbolWithCurrentValue,
  mapDropdownOptions,
  upperCaseFirstLetter,
  getCurrentUtcTime,
  clearALLCookies,
  formatDate,
  getDecryptedToken,
  findSelectedOptions,
  replaceDollarSymbol,
  convertPositiveDecimalTwoDigit,
  convertCanvasToFile,
};

export function convertArrayOfObjectsToCSV(
  data: Array<any>,
  columnNames: Array<{ key: string; name: string }>
) {
  let result: any;

  const columnDelimiter = ",";
  const lineDelimiter = "\n";

  result = "";

  // Write column names with bold formatting
  columnNames.forEach((column) => {
    result += `${column.name} ${columnDelimiter}`;
  });

  result = result.slice(0, -columnDelimiter.length); // Remove the last column delimiter
  result += lineDelimiter;

  data.forEach((item: any) => {
    columnNames.forEach((column) => {
      result += `${item[column.key]} ${columnDelimiter}`;
    });
    result = result.slice(0, -columnDelimiter.length); // Remove the last column delimiter
    result += lineDelimiter;
  });

  const link = document.createElement("a");
  if (result == null) return;

  const filename = "export.csv";

  if (!result.match(/^data:text\/csv/i)) {
    result = `data:text/csv;charset=utf-8,${result}`;
  }
  link.setAttribute("href", encodeURI(result));
  link.setAttribute("download", filename);
  link.click();
}

/**
 * Convert a base64 string to a File object.
 * @param {string} base64String - The base64 string to convert.
 * @param {string} filename - The name to give to the file.
 * @param {string} mimeType - The MIME type of the file.
 * @returns {File} - The File object created from the base64 string.
 */
export function base64StringToFile(
  base64String: string,
  filename: string,
  mimeType: string
): File {
  // Convert base64 to binary data
  const binaryString = atob(base64String);
  const byteArray = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    byteArray[i] = binaryString.charCodeAt(i);
  }

  // Create a Blob object
  const blob = new Blob([byteArray], { type: mimeType });

  // Create a File object from the Blob
  const file = new File([blob], filename, { type: mimeType });

  return file;
}

export async function convertJsonToExcel(
  excelData: any[],
  fileNameToSave: string,
  requiredKeys: { value: string; label: string }[]
) {
  // Extract only the required keys from each object
  const formattedData = excelData.map((entry) => {
    // Use the key property from requiredKeys for value extraction
    return Object.fromEntries(
      requiredKeys.map(({ value, label }) => [label, entry[value]])
    );
  });

  //for nested values
  // const formattedData = excelData.map((entry) => {
  //   let formattedEntry: any = {};
  //   requiredKeys.forEach(({ value, label }) => {
  //     const keys = value.split("."); // Split nested keys
  //     let nestedValue = entry;
  //     for (const key of keys) {
  //       nestedValue = nestedValue[key]; // Traverse nested properties
  //       if (nestedValue === undefined) break; // Break if any property is undefined
  //     }
  //     formattedEntry[label] = nestedValue;
  //   });
  //   return formattedEntry;
  // });

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

export const customGeneratePDF = (
  data: any[],
  headerNames: string[],
  fileName: string,
  autoPrint: boolean,
  columnStyles: { [key: number]: { halign: string } },
  pdfHeader?: string[]
) => {
  const doc = new jsPDF();

  doc.setFontSize(16);
  // Calculate the center position based on the page width
  const pageWidth = doc.internal.pageSize.getWidth();

  // Add the custom header (centered and two lines)
  if (pdfHeader) {
    pdfHeader.forEach((line, index) => {
      const textWidth = doc.getTextWidth(line);
      const textX = (pageWidth - textWidth) / 2; // Center align the text
      doc.text(line, textX, 20 + index * 10); // Adjust y-position for each line
    });
  }
  // Set up table data and bold styling
  const rows = data.map((row, index) => ({
    ...row.data,
    bold: row.bold, // Include bold property
  }));

  doc.autoTable({
    head: [headerNames],
    body: rows.map((row) => Object.values(row)), // Use only the data array
    startY: 40,
    styles: {
      fontSize: 10,
      cellPadding: 2,
    },

    columnStyles: columnStyles,
    headStyles: {
      halign: "", // Center-align all headers by default
    },
    didParseCell: function (data: any) {
      // Check if the cell is in the header row and the second column
      if (data.section === "head" && data.column.index === 1) {
        data.cell.styles.halign = "right"; // Right-align the second header
      }
    },
  });

  const pdfBlob = doc.output("blob");

  // Create a URL for the Blob
  const pdfUrl = URL.createObjectURL(pdfBlob);

  // Open the URL in a new window
  window.open(pdfUrl, "_blank");

  // Optionally, revoke the object URL after a delay to clean up
  setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
};

export const checkCompanyRole = (
  list_company_id: number,
  companySpecificRoles: any[]
) => {
  return companySpecificRoles.some(
    (company: any) =>
      Number(company?.companyId) === Number(list_company_id) &&
      (company?.role === "PRIMARY ADMIN" || company?.role === "ADMIN")
  );
};

// Function to add commas to the integer part of a number
const addCommas: any = (value: string): string => {
  return new Intl.NumberFormat("en-US").format(parseInt(value, 10) || 0);
};

// Function to format a number with commas and handle decimal part
export const formatNumberWithCommas = (
  numericValue: string,
  originalInput: string
): string => {
  // Split the number into integer and decimal parts
  let parts = numericValue.split(".");
  let integerPart = parts[0];
  let decimalPart = parts[1] || "";

  // Use the addCommas function to format the integer part
  const formattedInteger = addCommas(integerPart);

  // Prepare the final formatted number
  let formattedValue;
  if (decimalPart.length === 0 && originalInput.includes(".")) {
    formattedValue = `$ ${formattedInteger}.`;
  } else if (decimalPart.length > 0) {
    formattedValue = `$ ${formattedInteger}.${decimalPart.slice(0, 2)}`;
  } else {
    formattedValue = `$ ${formattedInteger}`;
  }

  return formattedValue;
};

export const removeCommas = (value: string): string => {
  return value.replace(/,/g, "");
};

export const formatDollars = (value: string): string => {
  // Split the number by the decimal point
  const parts = value.split(".");
  // Add commas to the integer part
  const integerValue = parts[0].replace(/[^0-9.]/g, "");
  parts[0] = integerValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  // Join the integer and decimal parts (if present)
  return `$ ${parts.join(".")}`;
};

export const dataUrlToFile = (
  dataUrl: string,
  filename: string
): File | undefined => {
  const arr = dataUrl.split(",");
  if (arr.length < 2) {
    return undefined;
  }
  const mimeArr = arr[0].match(/:(.*?);/);
  if (!mimeArr || mimeArr.length < 2) {
    return undefined;
  }
  const mime = mimeArr[1];
  const buff = Buffer.from(arr[1], "base64");
  return new File([buff], filename, { type: mime });
};
