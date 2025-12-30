import { gql } from "@apollo/client";
import { toast } from "@/app/Toaster";
import { client } from "@/app/api/adminAPIs/adminAPIs";
import { SOMETHING_WENT_WRONG } from "@/common/constants/messages";
import { useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface NoticesListType {
  notice_date: string;
  bank_account_id: number;
  account_name: string;
  company_id: number;
  company_name: string;
  contract_id: number;
  notice_source: string;
  contract_name: string;
  notice_id: number;
  notice_type: string;
  project_id: number;
  project_name: string;
  status: string;
  id: string;
  bank_account_type: string;
}
// const printPreviewRef = useRef<HTMLDivElement>(null);
export const getNoticesListServices = async (
  data: any,
  setLoading?: Function
): Promise<{ total_count: number; project_list: NoticesListType[] } | any> => {
  try {
    const response = await client.query({
      query: gql`
        query ListAllNotices($payload: ListAllNoticesInput!) {
          listAllNotices(payload: $payload) {
            data {
              notices_list {
                account_name
                bank_account_id
                bank_account_type
                company_id
                company_name
                contract_id
                contract_name
                id
                notice_date
                notice_id
                notice_source
                notice_type
                payment_claim_id
                payment_id
                project_id
                project_name
                status
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: {
        payload: data,
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.listAllNotices?.status === "SUCCESS") {
      return response?.data?.listAllNotices?.data;
    }
    if (response?.data?.listAllNotices?.status === "ERROR") {
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

export const FetchDetailsOfANotice = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query FetchDetailsOfANotice($payload: FetchDetailsOfANoticeInput!) {
          fetchDetailsOfANotice(payload: $payload) {
            data {
              ViewType
              bank_account_id
              bank_account_name
              bank_account_number
              client_supplier_id
              client_supplier_name
              client_supplier_type
              company_id
              company_name
              contract_date
              contract_id
              contract_name
              id
              memo_notes
              notice_id
              notice_source
              notice_template {
                attachment_type
                file
                file_name
                file_path
                file_type
                id
              }
              notice_type
              project_date
              project_id
              project_name
              qbccNotice {
                attachment_type
                file
                file_name
                file_path
                file_type
                id
              }
              status
              supportDoc {
                attachment_type
                file
                file_name
                file_path
                file_type
                id
              }
              uploadedNotice {
                attachment_type
                file
                file_name
                file_path
                file_type
                id
              }
            }
            message
            status
          }
        }
      `,
      variables: {
        payload: data,
      },
    });
    if (response?.data?.fetchDetailsOfANotice?.status === "SUCCESS") {
      return response?.data?.fetchDetailsOfANotice?.data;
    }
    if (response?.data?.fetchDetailsOfANotice?.status === "ERROR") {
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

export const UpdateNotice = async (
  data: any,
  showToaster: boolean,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation UpdateNotice($payload: updateNoticesInput!) {
          updateNotice(payload: $payload) {
            data {
              notice_id
              status
            }
            message
            status
          }
        }
      `,
      variables: {
        payload: data,
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.updateNotice?.status === "SUCCESS") {
      showToaster && toast.success(response?.data?.updateNotice?.message);

      return true;
    }
    if (response?.data?.updateNotice?.status === "ERROR") {
      toast.error(response?.data?.updateNotice?.message);
      console.error(response?.data?.updateNotice?.message);
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
export const ListAllMailsOfANotice = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query ListAllMailsOfANotice($payload: ListAllMailsofANoticesInput!) {
          listAllMailsOfANotice(payload: $payload) {
            data {
              total_count
              mails_list {
                email_date
                email_from
                email_subject
                email_to
                id
                notice_id
                notice_mail_id
                client_supplier_name
                company_name
              }
            }
            message
            status
          }
        }
      `,
      variables: {
        payload: data,
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.listAllMailsOfANotice?.status === "SUCCESS") {
      // toast.success(response?.data?.listAllMailsOfANotice?.message);
      return response?.data?.listAllMailsOfANotice?.data;
    }
    if (response?.data?.listAllMailsOfANotice?.status === "ERROR") {
      toast.error(response?.data?.listAllMailsOfANotice?.message);
      console.error(response?.data?.listAllMailsOfANotice?.message);
      return null;
    }
  } catch (error: any) {
    toast.error(error.message || "Something went wrong in API");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
export const FetchDetailsOfANoticeMail = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query Query($payload: fetchNoticeMailInput!) {
          fetchDetailsOfANoticeMail(payload: $payload) {
            data {
              email_cc
              email_content
              email_from
              email_subject
              email_to
              id
              notice_id
              notice_mail_id
              supportDoc {
                attachment_type
                file
                file_name
                file_path
                file_type
                id
              }
              uploadedNotice {
                attachment_type
                file
                file_name
                file_path
                file_type
                id
              }
            }
            message
            status
          }
        }
      `,
      variables: {
        payload: data,
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.fetchDetailsOfANoticeMail?.status === "SUCCESS") {
      // toast.success(response?.data?.fetchDetailsOfANoticeMail?.message);
      return response?.data?.fetchDetailsOfANoticeMail?.data;
    }
    if (response?.data?.fetchDetailsOfANoticeMail?.status === "ERROR") {
      toast.error(response?.data?.fetchDetailsOfANoticeMail?.message);
      console.error(response?.data?.fetchDetailsOfANoticeMail?.message);
      return {};
    }
  } catch (error: any) {
    toast.error(error.message || "Something went wrong in API");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const GenerateMailForANotice = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation GenerateMailForANotice(
          $payload: GenerateMailForANoticeInput!
        ) {
          generateMailForANotice(payload: $payload) {
            data {
              id
              notice_mail_id
            }
            message
            status
          }
        }
      `,
      variables: {
        payload: data,
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.generateMailForANotice?.status === "SUCCESS") {
      // toast.success(response?.data?.generateMailForANotice?.message);
      return response?.data?.generateMailForANotice?.data;
    }
    if (response?.data?.generateMailForANotice?.status === "ERROR") {
      toast.error(response?.data?.generateMailForANotice?.message);
      console.error(response?.data?.generateMailForANotice?.message);
      return {};
    }
  } catch (error: any) {
    toast.error(error.message || "Something went wrong in API");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
export const SentMailForANotice = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation SentMailForANotice($payload: SentMailForANoticeInput!) {
          sentMailForANotice(payload: $payload) {
            message
            status
          }
        }
      `,
      variables: {
        payload: data,
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.sentMailForANotice?.status === "SUCCESS") {
      toast.success(response?.data?.sentMailForANotice?.message);
      return true;
    }
    if (response?.data?.sentMailForANotice?.status === "ERROR") {
      toast.error(response?.data?.sentMailForANotice?.message);
      console.error(response?.data?.sentMailForANotice?.message);
      return false;
    }
  } catch (error: any) {
    toast.error(error.message || "Something went wrong in API");
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};
export const UpdateNoticeMail = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation UpdateNoticeMail($payload: updateNoticesMailInput!) {
          updateNoticeMail(payload: $payload) {
            data {
              email_cc
              email_content
              email_from
              email_subject
              email_to
              id
              notice_mail_id
            }
            message
            status
          }
        }
      `,
      variables: {
        payload: data,
      },
      fetchPolicy: "no-cache",
    });
    // console.log(response, "response for update");
    if (response?.data?.updateNoticeMail?.status === "SUCCESS") {
      toast.success(response?.data?.updateNoticeMail?.message);
      return response?.data?.updateNoticeMail?.data;
    }
    if (response?.data?.updateNoticeMail?.status === "ERROR") {
      toast.error(response?.data?.updateNoticeMail?.message);
      console.error(response?.data?.updateNoticeMail?.message);
      return {};
    }
  } catch (error: any) {
    toast.error(error.message || "Something went wrong in API");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export function handleViewFile(displayFile: any) {
  if (
    displayFile &&
    typeof displayFile?.file === "string" &&
    displayFile.file?.includes("base64")
  ) {
    fetch(displayFile?.file)
      .then((res) => res.blob())
      .then((res) => {
        window.open(URL.createObjectURL(res), "_blank");
      });
  } else {
    window.open(URL.createObjectURL(displayFile), "_blank");
  }
}

export const handlePrintClick = (printPreviewRef: any) => {
  const printContent = printPreviewRef.current?.innerHTML;

  // Create a new element to contain the print content
  const printContainer = document.createElement("div");
  printContainer.innerHTML = printContent || "";

  // Hide all other elements on the page
  document.body.querySelectorAll("*").forEach((element) => {
    if (element !== printContainer) {
      element.classList.add("hide-on-print"); // Apply a CSS class to hide elements
    }
  });

  // Append the print container to the document body
  document.body.appendChild(printContainer);

  // Print the print container
  window.print();

  // Remove the print container after printing
  document.body.removeChild(printContainer);

  // Show all other elements on the page
  document.body.querySelectorAll("*").forEach((element) => {
    if (element !== printContainer) {
      element.classList.remove("hide-on-print"); // Remove the CSS class to show elements
    }
  });
};
export const PdfCreation = async (
  data: any,
  showToaster: boolean,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation GenerateDocForANotice($payload: GenerateMailForANoticeInput!) {
          generateDocForANotice(payload: $payload) {
            message
            status
            data {
              applicant_details {
                address
                company
                email
                name
                position
                postcode
              }
              project_trust_details
            }
          }
        }
      `,
      variables: {
        payload: data,
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.PdfCreation?.status === "SUCCESS") {
      showToaster && toast.success(response?.data?.PdfCreation?.message);

      return true;
    }
    if (response?.data?.PdfCreation?.status === "ERROR") {
      toast.error(response?.data?.PdfCreation?.message);
      console.error(response?.data?.PdfCreation?.message);
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

// export const handlePrintClick3 = async (printPreviewRef: any) => {
//   const printContent = printPreviewRef.current?.innerHTML;

//   if (!printContent) {
//     console.error("No content to print.");
//     return;
//   }

//   // Create a new element to contain the print content
//   const printContainer = document.createElement("div");
//   printContainer.innerHTML = printContent;

//   // Append the print container to the document body (hidden)
//   document.body.appendChild(printContainer);

//   // Convert the content to a canvas using html2canvas
//   const canvas = await html2canvas(printContainer);

//   // Create a new jsPDF instance
//   const pdf = new jsPDF({
//     orientation: "portrait",
//     unit: "px",
//     format: [canvas.width, canvas.height],
//   });

//   // Add the canvas image to the PDF
//   const imgData = canvas.toDataURL("image/png");
//   pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);

//   // Save the PDF (download)
//   pdf.save("document.pdf");

//   // Remove the print container from the document
//   document.body.removeChild(printContainer);
// };

// export const handlePrintClick2 = async (printPreviewRef: any) => {
//   const printContent = printPreviewRef.current?.innerHTML;

//   if (!printContent) {
//     console.error("No content to print.");
//     return;
//   }

//   // Create a new element to contain the print content
//   const printContainer = document.createElement("div");
//   printContainer.innerHTML = printContent;

//   // Append the print container to the document body (hidden)
//   document.body.appendChild(printContainer);

//   // Convert the content to a canvas using html2canvas
//   const canvas = await html2canvas(printContainer);

//   // Define A4 size in points (210mm x 297mm)
//   const a4Width = 595.28; // A4 width in points
//   const a4Height = 841.89; // A4 height in points

//   // Calculate the scaled dimensions to fit the content within A4 while maintaining aspect ratio
//   const imgWidth = a4Width;
//   const imgHeight = (canvas.height * imgWidth) / canvas.width;

//   // Create a new jsPDF instance with A4 format
//   const pdf = new jsPDF({
//     orientation: "portrait",
//     unit: "pt", // Points
//     format: "a4",
//   });

//   // Add the image to the PDF (centered vertically if it's shorter than A4)
//   const yOffset = imgHeight > a4Height ? 0 : (a4Height - imgHeight) / 2;
//   pdf.addImage(
//     canvas.toDataURL("image/png"),
//     "PNG",
//     0,
//     yOffset,
//     imgWidth,
//     imgHeight
//   );

//   // Save the PDF (download)
//   pdf.save("document.pdf");

//   // Remove the print container from the document
//   document.body.removeChild(printContainer);
// };

// const pdf = require("html-pdf");

// function generatePDFfromHTML(htmlContent: any, outputPath: any) {
//   pdf.create(htmlContent).toFile(outputPath, (err: any, res: any) => {
//     if (err) return console.log(err);
//     console.log("PDF generated successfully:", res);
//   });
// }
