import { gql } from "@apollo/client";

import axios from "axios";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { client } from "./adminApi/adminApi";
import { ERROR, SOMETHING_WENT_WRONG, SUCCESS } from "../message";

export const InsertActivityLog = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation InsertActivityLog(
          $createActivityLogInput: CreateActivityLogInput!
        ) {
          insertActivityLog(createActivityLogInput: $createActivityLogInput) {
            data {
              admin_id
              company_id
              dynamic_values
              event_date
              event_template_id
              from_user
              is_admin
              to_user
            }
            message
            status
          }
        }
      `,
      variables: {
        createActivityLogInput: {
          ...data,
        },
      },
      fetchPolicy: "no-cache",
    });
    return true;
    // if (response?.data?.adminUpdateCompany?.id) {
    //   toast.success("Company updated successfully");
    //   return true;
    // }
  } catch (error: any) {
    showErrorToast(error.message || "something went wrong in API");
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};

export const singleUploadApi = async (
  fileData: any,
  userData: any,
  accessToken: any
) => {
  let formData = new FormData();

  // Properly stringify the userData object
  const createFileUploadInput = JSON.parse(JSON.stringify(userData));

  formData.append(
    "operations",
    JSON.stringify({
      query:
        "mutation FileUpload($createFileUploadInput: CreateFileUploadInput!, $file: Upload!) { fileUpload(createFileUploadInput: $createFileUploadInput, file: $file) { data { attachment_type file_name file_path file_type id holiday_record { holiday_name holiday_date recurring_every_year message  } is_valid_record_available } message status }}",
      variables: {
        createFileUploadInput: createFileUploadInput,
        file: null,
      },
    })
  );
  formData.append("map", '{"0":["variables.file"]}');
  formData.append("0", fileData);
  const headers = {
    "Content-Type": "multipart/form-data",
    "apollo-require-preflight": true,
    authorization: "Bearer " + accessToken,
  };
  let url = `${process.env.NEXT_PUBLIC_GRAPHQL_URI}`;
  try {
    const response: any = await axios.post(url, formData, { headers });

    // Handle response as needed

    if (response?.data?.data?.fileUpload?.status === SUCCESS) {
      return {
        ...response?.data?.data?.fileUpload?.data,
        message: response?.data?.data?.fileUpload?.message,
        status: response?.data?.data?.fileUpload?.status,
      };
    } else {
      console.log(createFileUploadInput);
      if (createFileUploadInput?.attachment_type == "Admin_holiday") {
        return {
          ...response?.data?.data?.fileUpload?.data,
          message: response?.data?.data?.fileUpload?.message,
          status: response?.data?.data?.fileUpload?.status,
        };
      } else {
        return response?.errors || false;
      }
    }
  } catch (err) {
    if (fileData?.attachment_type == "Admin_holiday") {
      return err;
    } else {
      return false;
    }
    // Handle error as needed
  }
};

export const multipleFileUploadApi = async (
  fileData: any[],
  userData: any[],
  accessToken: any,
  noToaster?: boolean
) => {
  let formData = new FormData();

  formData.append(
    "operations",
    JSON.stringify({
      query:
        "mutation MultipleFilesUpload($uploadMultipleFilesInput: UploadMultipleFilesInput!) {multipleFilesUpload(uploadMultipleFilesInput: $uploadMultipleFilesInput) {data {attachment_type file file_path file_type file_name id} message status}}",
      variables: {
        uploadMultipleFilesInput: {
          files: Array.from({ length: fileData.length }, () => null), // Array with null values of the same length as fileData
          detailsOfFiles: userData,
        },
      },
    })
  );
  // Build the map object based on the fileData length and userData length
  let mapObject: { [key: string]: string[] } = {};
  for (let i = 0; i < fileData.length; i++) {
    mapObject[i] = [`variables.uploadMultipleFilesInput.files.${i}`];
  }
  userData?.forEach((data: any, index: number) => {
    mapObject[`variables.uploadMultipleFilesInput.detailsOfFiles.${index}`] = [
      `detailsOfFiles.${index}`,
    ];
  });
  formData.append("map", JSON.stringify(mapObject));
  // Append each file data to the FormData
  fileData.forEach((file: any, index: number) => {
    formData.append(`${index}`, file);
  });
  const headers = {
    "Content-Type": "multipart/form-data",
    "apollo-require-preflight": true,
    authorization: "Bearer " + accessToken,
  };
  let url = `${process.env.NEXT_PUBLIC_GRAPHQL_URI}`;
  try {
    const response = await axios.post(url, formData, { headers });
    // Handle response as needed
    if (response?.data?.data?.multipleFilesUpload?.status === SUCCESS) {
      return response?.data?.data?.multipleFilesUpload?.data;
    } else {
      {
        noToaster
          ? null
          : showErrorToast(
              response?.data?.data?.multipleFilesUpload?.message ||
                SOMETHING_WENT_WRONG
            );
      }
      console.error(
        "error",
        response?.data?.data?.multipleFilesUpload?.message ||
          SOMETHING_WENT_WRONG
      );
      return [];
    }
  } catch (err) {
    console.error("error", err);
    return [];
    // Handle error as needed
  }
};

export const getFileByAttachmentType = async (attachmentType: string) => {
  try {
    const response = await client.query({
      query: gql`
        query GetFile($attachmentType: String!) {
          getFile(attachmentType: $attachmentType) {
            message
            status
          }
        }
      `,
      variables: {
        attachmentType,
        fetchPolicy: "no-cache",
      },
    });

    // Handle the response as needed
    if (response?.data?.getFile?.status === "SUCCESS") {
      // You can return any relevant data from the response
      return response.data.getFile?.message;
    } else {
      // return response.data.getFile?.message;
      return null;
    }
  } catch (error: any) {
    return null;
  }
};

export interface GetListActionButtonsInput {
  payment_claim_id?: number;
  payment_id?: number;
}

export const getListActionButtons = async (
  getListActionButtonsInput: GetListActionButtonsInput,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query GetListActionButtons(
          $getListActionButtonsInput: GetListActionButtonsInput!
        ) {
          getListActionButtons(
            getListActionButtonsInput: $getListActionButtonsInput
          ) {
            data {
              claim_list_buttons
              claim_overview_buttons
              claim_type
              current_status
              payment_list_buttons
              payment_overview_buttons
              payment_type
              status_in_ui
            }
            message
            status
          }
        }
      `,
      variables: {
        getListActionButtonsInput,
      },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.getListActionButtons?.status === "SUCCESS") {
      return response?.data?.getListActionButtons?.data;
    }
    if (response?.data?.getListActionButtons?.status === "ERROR") {
      showErrorToast(response?.data?.getListActionButtons?.message);
      return null;
    }
    return null;
  } catch (error: any) {
    showErrorToast(error.message || "Something went wrong");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const generateSequenceId = async (
  profileType: string,
  setLoading?: Function
): Promise<string | null> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation GenerateSequenceId($profileType: String!) {
          generateSequenceId(profile_type: $profileType) {
            data
            message
            status
          }
        }
      `,
      variables: {
        profileType,
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.generateSequenceId?.status === "SUCCESS") {
      return response?.data?.generateSequenceId?.data;
    }
    if (response?.data?.generateSequenceId?.status === "ERROR") {
      return null;
    }
    return null;
  } catch (error: any) {
    showErrorToast(error.message || SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export async function deleteAttachment(postData: any): Promise<any> {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation DeleteFileByIdAndType(
          $attachmentId: String!
          $attachmentType: String!
          $id: String!
        ) {
          deleteFileByIdAndType(
            attachmentId: $attachmentId
            attachmentType: $attachmentType
            id: $id
          ) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.deleteFileByIdAndType?.status === SUCCESS) {
      return true;
    }
    if (response?.data?.deleteFileByIdAndType?.status === ERROR) {
      return false;
    }
  } catch (error: any) {
    return false;
  }
}

export const ReadFileAttachmentsOrDocuments = async (data: any) => {
  try {
    const response = await client.query({
      query: gql`
        query ReadFileAttachmentsOrDocuments(
          $payload: ReadFileAttachmentsOrDocumentsInput!
        ) {
          readFileAttachmentsOrDocuments(payload: $payload) {
            data {
              attachment_type
              file
              file_path
              file_type
              id
              name
              uploaded_on
              file_name
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

    if (response?.data?.readFileAttachmentsOrDocuments?.status === "SUCCESS") {
      return response.data.readFileAttachmentsOrDocuments?.data || [];
    } else {
      console.error(
        "Error in getFileByAttachmentType:",
        response?.data?.readFileAttachmentsOrDocuments?.message
      );
      return [];
    }
  } catch (error: any) {
    console.error("Error in getFileByAttachmentType:", error);
    return [];
  }
};

export async function UpdateFileAttachmentsOrDocuments(
  data: any
): Promise<any> {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation UpdateFileAttachmentsOrDocuments(
          $payload: UpdateFileAttachmentsOrDocumentsInput!
        ) {
          updateFileAttachmentsOrDocuments(payload: $payload) {
            data {
              id
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
    if (response?.data?.updateFileAttachmentsOrDocuments?.status === SUCCESS) {
      return true;
    }
    if (response?.data?.updateFileAttachmentsOrDocuments?.status === ERROR) {
      return false;
    }
  } catch (error: any) {
    return false;
  }
}

export const GenerateNotice = async (data: any): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation GenerateNotice($payload: generateNoticeInput!) {
          generateNotice(payload: $payload) {
            data {
              notice_id
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.generateNotice?.status === SUCCESS) {
      showSuccessToast(
        response?.data?.generateNotice?.message ||
          "Notice generated successfully."
      );
      return true;
    }
    if (response?.data?.generateNotice?.status === ERROR) {
      showErrorToast(
        response?.data?.generateNotice?.message ||
          "Issue in Notice generate please try again."
      );
      return false;
    }
  } catch (error: any) {
    showErrorToast("Issue in Notice generate please try again.");
    return false;
  }
};

export const fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query FetchFiltersOfPaymentClaimsPaymentsAndRetentionsList(
          $payload: FetchFiltersOfPaymentClaimsPaymentsAndRetentionsListInput!
        ) {
          fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList(
            payload: $payload
          ) {
            data {
              clientSuppliers {
                client_supplier_id
                client_supplier_name
                client_supplier_type
              }
              contracts {
                contract_id
                contract_name
              }
              projects {
                project_id
                project_name
              }
            }
            message
            status
          }
        }
      `,
      variables: { payload: data },
      fetchPolicy: "no-cache",
    });

    if (
      response &&
      response.data.fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList
        .status === SUCCESS
    ) {
      return response.data.fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList
        .data;
    }

    if (
      response &&
      response.data.fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList
        .status === ERROR
    ) {
      showErrorToast(
        response.data.fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList
          .message
      );
      return null;
    }
  } catch (error: any) {
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export async function fetchGetAllSubscriptionPlanListForUser(): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query GetAllSubscriptionPlanListForUser {
          getAllSubscriptionPlanListForUser {
            data {
              free_plan {
                bill_cycle
                description
                id
                is_active
                is_deleted
                plan_id
                plan_items {
                  description
                  dropdown_type
                  id
                  is_unlimited
                  item_id
                  item_name
                  item_status
                  limit_type
                  limit_value
                  plan_item_id
                  unit_type
                }
                plan_name
                plan_status
                plan_type
                price
                price_id
                price_name
                stripe_price_id
                stripe_product_id
                trial_period
                unformatted_price
              }
              monthly_plan_list {
                bill_cycle
                description
                id
                is_active
                is_deleted
                plan_id
                plan_items {
                  description
                  dropdown_type
                  id
                  is_unlimited
                  item_id
                  item_name
                  item_status
                  limit_type
                  limit_value
                  plan_item_id
                  unit_type
                }
                plan_name
                plan_status
                plan_type
                price
                price_id
                price_name
                stripe_price_id
                stripe_product_id
                trial_period
                unformatted_price
              }
              yearly_plan_list {
                bill_cycle
                description
                id
                is_active
                is_deleted
                plan_id
                plan_items {
                  description
                  dropdown_type
                  id
                  is_unlimited
                  item_id
                  item_name
                  item_status
                  limit_type
                  limit_value
                  plan_item_id
                  unit_type
                }
                plan_name
                plan_status
                plan_type
                price
                price_id
                price_name
                stripe_price_id
                stripe_product_id
                trial_period
                unformatted_price
              }
            }
            message
            status
          }
        }
      `,

      fetchPolicy: "no-cache",
    });

    const { status, data } = response?.data?.getAllSubscriptionPlanListForUser;

    return status === SUCCESS ? data : null;
  } catch (error: any) {
    return false;
  }
}

export const triggerActivityLogAfterAnUserIsSignedOut = async (
  payload: any,
  setLoading?: Function
): Promise<boolean | null> => {
  // console.log("🚀 ~ payload:", payload);
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation TriggerActivityLogAfterAnUserIsSignedOut(
          $adminId: Float
          $userId: Float
        ) {
          triggerActivityLogAfterAnUserIsSignedOut(
            admin_id: $adminId
            user_id: $userId
          ) {
            data
            message
            status
          }
        }
      `,
      variables: {
        userId: payload?.user_id || null,
        adminId: payload?.admin_id || null,
      },
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.triggerActivityLogAfterAnUserIsSignedOut?.status ===
      "SUCCESS"
    ) {
      return true;
    }

    if (
      response?.data?.triggerActivityLogAfterAnUserIsSignedOut?.status ===
      "ERROR"
    ) {
      console.error(
        response?.data?.triggerActivityLogAfterAnUserIsSignedOut?.message
      );
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

export const triggerActivityLogWhileSwitchingBusinessProfile = async (
  payload: any,
  setLoading?: Function
): Promise<boolean | null> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation TriggerActivityLogWhileSwitchingBusinessProfile(
          $payload: TriggerActivityLogWhileSwitchingBusinessProfileInput!
        ) {
          triggerActivityLogWhileSwitchingBusinessProfile(payload: $payload) {
            data
            message
            status
          }
        }
      `,
      variables: {
        payload,
      },
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.triggerActivityLogWhileSwitchingBusinessProfile
        ?.status === "SUCCESS"
    ) {
      return true;
    }

    if (
      response?.data?.triggerActivityLogWhileSwitchingBusinessProfile
        ?.status === "ERROR"
    ) {
      console.error(
        response?.data?.triggerActivityLogWhileSwitchingBusinessProfile?.message
      );
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
