import { client } from "@/app/api/apolloClientServices";
import { SOMETHING_WENT_WRONG, SUCCESS } from "@/common/constants/messages";
import { gql } from "@apollo/client";
import { toast } from "react-toastify";

export async function fetchSubscriptionType(): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query AdminListSubscriptionPlans {
          adminListSubscriptionPlans {
            data {
              subscriptionPlans {
                actual_price
                bill_cycle
                description
                discounted_price
                id
                items {
                  subscriptionItems {
                    id
                    item_name
                    selected
                  }
                }
                period
                plan_name
                plan_type
                stripe_plan_id
                subscription_status
              }
              totalCount
            }
            message
            status
          }
        }
      `,
      variables: {},
      fetchPolicy: "no-cache",
    });

    if (response?.data?.adminListSubscriptionPlans?.status === SUCCESS) {
      return response?.data?.adminListSubscriptionPlans?.data
        ?.subscriptionPlans;
    } else {
      return {};
    }
  } catch (error: any) {
    return {};
  }
}

export const fetchBusinessDetails = async (companyId: number): Promise<any> => {
  try {
    const response = await client.query({
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
    toast.error(error.message || SOMETHING_WENT_WRONG);
    return [];
  }
};

export async function updateBusinessDetails(inputData: Object) {
  try {
    const response = await client.mutate({
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
            }
            message
            status
          }
        }
      `,
      variables: { updateCompanySignupInput: inputData },
    });
    if (response?.data?.updateCompanyDetails?.status === SUCCESS) {
      // toast.success("updateCompanyDetails updated successfully");
      return response?.data?.updateCompanyDetails?.data;
    } else {
      toast.error(response?.data?.updateCompanyDetails?.message);
      return null;
    }
  } catch (error: any) {
    // Handle errors
    toast.error(error?.message || SOMETHING_WENT_WRONG);
  }
}

export const fetchTrustTrackingById = async (
  companyId: number
): Promise<any> => {
  try {
    const response = await client.query({
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
    toast.error(error.message || SOMETHING_WENT_WRONG);
    return [];
  }
};

export const DeleteTrustTrainingRecordById = async (
  data: any
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation DeleteTrustTrainingRecordsById(
          $companyId: Float!
          $idArray: [String!]!
        ) {
          deleteTrustTrainingRecordsById(
            companyId: $companyId
            idArray: $idArray
          ) {
            message
            status
          }
        }
      `,
      variables: data,
    });
    if (response?.data?.deleteTrustTrainingRecordsById?.status === "SUCCESS") {
      return response?.data?.deleteTrustTrainingRecordsById?.data;
    }
    if (response?.data?.deleteTrustTrainingRecordsById?.status === "ERROR") {
      return [];
    }
  } catch (error: any) {
    toast.error(error.message || SOMETHING_WENT_WRONG);
    return [];
  }
};

export async function UpdateSubscriptionDetails(inputData: Object) {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation UpdateSubscriptionDetails(
          $updateSubscriptionInput: UpdateSubscriptionInput!
        ) {
          updateSubscriptionDetails(
            updateSubscriptionInput: $updateSubscriptionInput
          ) {
            message
            status
          }
        }
      `,
      variables: { updateSubscriptionInput: inputData },
    });
    if (response?.data?.updateSubscriptionInput?.status === SUCCESS) {
      // toast.success("updateSubscriptionInput updated successfully");
      return true;
    } else {
      toast.error(response?.data?.updateSubscriptionInput?.message);
      return false;
    }
  } catch (error: any) {
    // Handle errors
    toast.error(error?.message || SOMETHING_WENT_WRONG);
  }
}
