import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import {
  applicationStorage,
  DateFormat,
  UploadImage,
} from "@/shared/constant/general";
import { ImageErrors } from "@/shared/constant/messages";
import { deleteCookie, getCookie } from "cookies-next";
import { format } from "date-fns";
import { jwtDecode } from "jwt-decode";
import slugify from "slugify";
import { io, Socket } from "socket.io-client";

function formatDate(
  value: any,
  formatType: string = DateFormat.DD_MM_YYYY_SLASH
) {
  try {
    return value ? format(new Date(value), formatType) : "";
  } catch {
    return value;
  }
}

function getCompanyIdFromStorage() {
  return Number(getCookie(applicationStorage.COMPANY_ID)) || "";
}

function getLastDateOfCurrentMonth(date?: any) {
  const now = date ? new Date(date) : new Date(); // Get the current date
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Get the last day of the month
  return lastDay.getDate();
}

function replaceDollarSymbol(value: any) {
  return value ? value?.toString().replace(/\$\s*/, "") : "";
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

function getCurrentUtcTime() {
  return new Date().toISOString().replace("T", " ").split(".")[0] + " UTC";
}

function getDatePickerFormat(specificDate?: string, monthFormat?: boolean) {
  //by default returns current date if no date has been passed
  const today = specificDate ? new Date(specificDate) : new Date();

  const day = String(today.getDate()).padStart(2, "0"); // Ensures two digits
  const month = String(today.getMonth() + 1).padStart(2, "0"); // Months are zero-indexed
  const year = today.getFullYear();

  return monthFormat ? `${year}-${month}` : `${year}-${month}-${day}`;
}

function dateStringToUtcConversion(date: string) {
  const dateString = date;

  try {
    // Create a Date object with the specified date and time in IST
    // Split the input string (assumes DD/MM/YYYY)
    const [year, month, day] = dateString.split("-").map(Number);

    // Create a Date object in the local timezone
    const localDate = new Date(year, month - 1, day); // Month is 0-based

    // Convert to UTC ISO format

    return localDate.toISOString(); // Always gives UTC (with Z)
  } catch {}
}

function jsDateConversion(date: string) {
  const dateString = date;
  const [day, month, year]: any = dateString.split("-");
  // Create a new Date object (month is 0-based, so subtract 1)
  const dateObject = new Date(year, month - 1, day);
  return dateObject;
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

function clearBrowserStorage() {
  sessionStorage.clear();
  localStorage.removeItem("accessVerification");
  deleteCookie("accessVerification");
  localStorage.removeItem("auth-logout");
  localStorage.removeItem("ProfileType");
  localStorage.removeItem("UserCompanyId");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("companyId");
  localStorage.removeItem("userMode");
  localStorage.removeItem("dontShowPopup");
  localStorage.removeItem("xeroIntegrationId");
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
      : "";

  return value ? Math.abs(value).toFixed(2) : null;
}

function convertCanvasToFile(selectedCanvas: any, selectedImage: any) {
  return new Promise((resolve, reject) => {
    selectedCanvas.current?.toBlob((blob: any) => {
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

function handleSelectedImage(
  file: File,
  allowedFileTypes = UploadImage.jpegAndPng,
  fileSizeLimit = UploadImage.twoMB,
  invalidImageError = ImageErrors.INVALID_FILE_TYPE_JPG_PNG,
  fileLimitError = ImageErrors.FILE_LIMIT_EXCEEDS_2MB
) {
  // Validate file type
  if (!allowedFileTypes.includes(file.type)) {
    showErrorToast(invalidImageError);
    return invalidImageError;
  }

  // Validate file size
  if (file.size > fileSizeLimit) {
    showErrorToast(fileLimitError);

    return;
  }

  // If validations pass, return image
  return [file];
}

function generateUniqueId() {
  // Combine a random number with the current timestamp
  return (
    Math.random().toString() + // Generate a random string
    Date.now().toString() // Append current timestamp
  );
}

const formatDollars = (value: string): string => {
  // Split the number by the decimal point
  const parts = value.split(".");
  // Add commas to the integer part
  const integerValue = parts[0].replace(/[^0-9.]/g, "");
  parts[0] = integerValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  // Join the integer and decimal parts (if present)
  return `$${parts.join(".")}`;
};

const removeCommas = (value: string): string => {
  return value?.toString().replace(/,/g, "");
};

const stripHtml = (html: any) => {
  if (!html) return "";
  // Use regex-based approach that works on both server and client
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&')  // Replace &amp; with &
    .replace(/&lt;/g, '<')   // Replace &lt; with <
    .replace(/&gt;/g, '>')   // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#39;/g, "'")  // Replace &#39; with '
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim()
    .substring(0, 500);      // Limit to 500 chars for descriptions
};
const commonCookies = {
  NAVIGATED_FROM: "navigated-from",
};

function getDecryptedToken() {
  // Extract the authentication token from cookies
  const authToken: any = localStorage.getItem("accessToken");
  // Decrypt the authentication token
  return authToken ? jwtDecode(authToken) : "";
}

function slugifyString(data: string) {
  return slugify(data || "", {
    lower: true,
    strict: true,
    trim: true,
    remove: /[*+~.()'"!:@]/g,
  });
}

function handleUserActivity() {
  const now = Date.now();
  localStorage.setItem("last_activity", now.toString());
}

const downloadPDF = async (
  pdfUrl: string | URL | Request,
  fileName: string
) => {
  try {
    const response = await fetch(pdfUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch {}
};

function connectWebSocket(): Promise<any> {
  return new Promise((resolve, reject) => {
    const socket: Socket = io(`${process.env.NEXT_PUBLIC_SOCKET_URL}`, {
      transports: ["polling", "websocket"],
      upgrade: true,
    });

    socket.on("connect", () => {
      resolve(socket.id);
    });

    socket.on("error", (error) => {
      reject(error);
    });

    socket.on("pdf-ready", (event) => {
      if (localStorage.getItem("accessToken")) {
        showSuccessToast(event.message);
        if (event?.downloadUrl?.endsWith(".pdf")) {
          window.open(event.downloadUrl, "_blank");
        }
        const splitArray = event?.downloadUrl?.split("/");
        if (splitArray?.length) {
          const fileName = splitArray[splitArray?.length - 1];
          downloadPDF(event.downloadUrl, fileName);
        }
      }
      socket.disconnect();
    });

    socket.on("force-disconnect", () => socket.disconnect());
  });
}

function fileToBase64(file: any) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

function base64ToFile(
  base64String: string,
  fileName: string,
  fileType: string
) {
  const byteCharacters = atob(base64String.split(",")[1]); // Decode Base64
  const byteNumbers = new Array(byteCharacters.length)
    .fill(0)
    .map((_, i) => byteCharacters.charCodeAt(i));
  const byteArray = new Uint8Array(byteNumbers);
  return new File([byteArray], fileName, { type: fileType });
}

const downloadFile = async (fileUrl: string, fileName: string) => {
  try {
    const response = await fetch(fileUrl, {
      method: "GET",
    });

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Download failed:", error);
  }
};

export {
  fileToBase64,
  base64ToFile,
  removeCommas,
  formatDate,
  getCompanyIdFromStorage,
  clearBrowserStorage,
  convertPositiveDecimalTwoDigit,
  convertCanvasToFile,
  handleSelectedImage,
  generateUniqueId,
  getCurrentUtcTime,
  formatDollars,
  getDatePickerFormat,
  dateStringToUtcConversion,
  getSubscriptionType,
  jsDateConversion,
  stripHtml,
  commonCookies,
  getLastDateOfCurrentMonth,
  getDecryptedToken,
  slugifyString,
  replaceDollarSymbol,
  mapDropdownOptions,
  handleUserActivity,
  downloadPDF,
  connectWebSocket,
  downloadFile,
};
