import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";
import { toast } from "react-toastify";

export const fetchBusinessDetails = async (companyId: number): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetCompanyDetailsById($company_id: Float!) {
          getCompanyDetailsById(company_id: $company_id) {
            data {
              abn_number
              accounting_system
              acn_number
              cis_rate
              company_address
              company_email_id
              company_id
              company_name
              company_number
              company_phone_no
              country
              has_bank_account
              entity_type
              expiry_date
              file
              file_path
              file_type
              id
              is_admin_blocked
              is_verified
              latitude
              legal_company_name
              longitude
              place_id
              plan_name
              plan_type
              qbcc_number
              region
              signature
              subscription_id
              tfn_number
              utr_number
              vat_number
              signature_type
              email_preferences
              is_gst_registered
              notices_auto_send
            }
            message
            status
          }
        }
      `,
      variables: {
        company_id: companyId, // Pass company_id instead of companyId
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.getCompanyDetailsById?.status === "SUCCESS") {
      return response?.data?.getCompanyDetailsById?.data;
    }
    if (response?.data?.getCompanyDetailsById?.status === "ERROR") {
      return [];
    }
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);
    return [];
  }
};

export const fetchTrustTrackingById = async (
  companyId: number
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetTrustTrainingRecordsByCompany($companyId: Float!) {
          getTrustTrainingRecordsByCompany(companyId: $companyId) {
            data {
              file
              file_path
              file_type
              id
              name
              uploaded_on
            }
            message
            status
          }
        }
      `,
      variables: {
        companyId,
      },
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.getTrustTrainingRecordsByCompany?.status === "SUCCESS"
    ) {
      return response?.data?.getTrustTrainingRecordsByCompany?.data;
    }
    if (response?.data?.getTrustTrainingRecordsByCompany?.status === "ERROR") {
      return [];
    }
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);
    return [];
  }
};

export async function updateBusinessDetails(inputData: Object) {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation UpdateCompanyDetails(
          $updateCompanySignupInput: UpdateCompanySignupInput!
        ) {
          updateCompanyDetails(
            updateCompanySignupInput: $updateCompanySignupInput
          ) {
            data {
              abn_number
              accounting_system
              acn_number
              cis_rate
              company_address
              company_email_id
              company_id
              company_name
              company_number
              company_phone_no
              country
              entity_type
              expiry_date
              file
              file_path
              file_type
              id
              is_admin_blocked
              is_verified
              latitude
              legal_company_name
              longitude
              place_id
              plan_name
              plan_type
              qbcc_number
              region
              signature
              signature_type
              subscription_id
              tfn_number
              utr_number
              vat_number
              is_gst_registered
              notices_auto_send
            }
            message
            status
          }
        }
      `,
      variables: { updateCompanySignupInput: inputData },
    });
    if (response?.data?.updateCompanyDetails?.status === ApiResponse.SUCCESS) {
      // toast.success("updateCompanyDetails updated successfully");
      return {
        data: response?.data?.updateCompanyDetails?.data,
        status: true,
      };
    } else {
      showErrorToast(response?.data?.updateCompanyDetails?.message);
      return false;
    }
  } catch (error: any) {
    // Handle errors
    showErrorToast(error?.message || ApiResponse.SOMETHING_WENT_WRONG);
  }
}
export const insertCompanyDetails = async (
  inputData: Object,
  token?: string
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation InsertCompanyDetails(
          $createCompanySignupInput: CreateCompanySignupInput!
        ) {
          insertCompanyDetails(
            createCompanySignupInput: $createCompanySignupInput
          ) {
            data {
              abn_number
              accounting_system
              acn_number
              cis_rate
              company_address
              company_email_id
              company_id
              company_name
              company_number
              company_phone_no
              country
              entity_type
              expiry_date
              file
              file_path
              file_type
              id
              is_admin_blocked
              is_verified
              latitude
              legal_company_name
              longitude
              place_id
              plan_name
              plan_type
              qbcc_number
              region
              subscription_id
              tfn_number
              utr_number
              vat_number
            }
            message
            status
          }
        }
      `,
      variables: {
        createCompanySignupInput: inputData,
      },
    });

    // Handle the response as needed
    if (response?.data?.insertCompanyDetails?.status === "SUCCESS") {
      return {
        data: response?.data?.insertCompanyDetails?.data,
        status: true,
      };
    }
    if (response?.data?.insertCompanyDetails?.status === "ERROR") {
      showErrorToast(response?.data?.insertCompanyDetails?.message);
      return false;
    }
    // Return the array of company profiles with logos
    return false;
  } catch (error) {
    // Handle errors
    throw error;
  }
};

export async function DeleteFile(postData: any) {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation DeleteFile($attachmentType: String!, $companyId: Float) {
          deleteFile(attachmentType: $attachmentType, companyId: $companyId) {
            message
            status
          }
        }
      `,
      variables: postData,
    });

    if (response?.data?.deleteFile?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.deleteFile?.message);
      return true;
    } else {
      showErrorToast(response?.data?.deleteFile?.message);
      return false;
    }
  } catch (error: any) {
    // Handle errors
    showErrorToast(error?.message || ApiResponse.SOMETHING_WENT_WRONG);
  }
}
