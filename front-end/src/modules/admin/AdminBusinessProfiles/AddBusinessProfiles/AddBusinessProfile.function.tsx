import { ERROR, SOMETHING_WENT_WRONG, SUCCESS } from "@/app/message";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

export const AdminGetCompanyById = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query AdminGetCompanyById($companyId: Float!) {
          adminGetCompanyById(company_id: $companyId) {
            data {
              abn_number
              acn_number
              company_address
              company_email_id
              company_id
              company_name
              company_phone_no
              country
              entity_type
              expiry_date
              icon_base64
              icon_file_path
              icon_file_type
              id
              is_admin_blocked
              is_verified
              latitude
              legal_company_name
              longitude
              place_id
              plan_id
              plan_name
              primary_admin_id
              primary_admin_name
              qbcc_number
              region
              subscription_id
              subscription_status
              tfn_number
              utr_number
              vat_number
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.adminGetCompanyById?.status === SUCCESS) {
      return response?.data?.adminGetCompanyById?.data;
    }
    if (response?.data?.adminGetCompanyById?.status === ERROR) {
      console.error(response?.data?.adminGetCompanyById?.message);
      showErrorToast(response?.data?.adminGetCompanyById?.message);
      return {};
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return {};
  } finally {
    setLoading && setLoading(false);
  }
};

export const AdminUpdateCompany = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation AdminUpdateCompany(
          $updateAdminInput: UpdateCompanyDetailsInput!
        ) {
          adminUpdateCompany(updateAdminInput: $updateAdminInput) {
            data {
              abn_number
              acn_number
              company_address
              company_email_id
              company_id
              company_name
              company_phone_no
              country
              entity_type
              icon_base64
              icon_file_path
              icon_file_type
              id
              is_admin_blocked
              is_verified
              latitude
              legal_company_name
              longitude
              place_id
              qbcc_number
              region
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
        updateAdminInput: {
          ...data,
        },
      },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.adminUpdateCompany?.status === SUCCESS) {
      showSuccessToast(successMsg || "Company updated successfully");
      return true;
    }
    if (response?.data?.adminUpdateCompany?.status === ERROR) {
      console.error(response?.data?.adminUpdateCompany?.message);
      showErrorToast(response?.data?.adminUpdateCompany?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error.message || SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};

export const AdminCreateCompanyDetails = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation AdminCreateCompanyDetails(
          $adminCreateCompanyInput: AdminCreateCompanyInput!
        ) {
          AdminCreateCompanyDetails(
            adminCreateCompanyInput: $adminCreateCompanyInput
          ) {
            data {
              abn_number
              acn_number
              company_address
              company_email_id
              company_id
              company_name
              company_phone_no
              country
              entity_type
              icon_base64
              icon_file_path
              icon_file_type
              id
              is_admin_blocked
              is_verified
              latitude
              legal_company_name
              longitude
              place_id
              qbcc_number
              region
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
        adminCreateCompanyInput: {
          ...data,
        },
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.AdminCreateCompanyDetails?.status === SUCCESS) {
      showSuccessToast(successMsg || "Company added successfully");
      return response?.data?.AdminCreateCompanyDetails?.data;
    }
    if (response?.data?.AdminCreateCompanyDetails?.status === ERROR) {
      console.error(response?.data?.AdminCreateCompanyDetails?.message);
      showErrorToast(response?.data?.AdminCreateCompanyDetails?.message);
      return {
        companyId: "",
      };
    }
  } catch (error: any) {
    showErrorToast(error.message || SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return {
      companyId: "",
    };
  } finally {
    setLoading && setLoading(false);
  }
};

export const DeleteFile = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
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
      variables: {
        ...data,
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.deleteFile?.status === "SUCCESS") {
      showSuccessToast(response?.data?.deleteFile?.message);
      return true;
    }
    if (response?.data?.deleteFile?.status === "ERROR") {
      showErrorToast(response?.data?.deleteFile?.message);
      return false;
    }
    return false;
  } catch (error: any) {
    showErrorToast(error.message || SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};
