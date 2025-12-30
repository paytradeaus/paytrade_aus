import { client } from "@/app/api/apolloClientServices";
import { toast } from "@/app/Toaster";
import { ERROR, SUCCESS } from "@/common/constants/messages";
import { gql } from "@apollo/client";

export async function fetchAllDropdowns(postData: any): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query FetchAllFiltersInAdminCompliancesList(
          $payload: FetchAllFiltersInAdminCompliancesListInput!
        ) {
          fetchAllFiltersInAdminCompliancesList(payload: $payload) {
            data {
              account_list {
                bank_account_id
                bank_account_name
              }
              company_list {
                company_id
                company_name
              }
              project_list {
                project_id
                project_name
              }
              account_types
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.fetchAllFiltersInAdminCompliancesList?.status === SUCCESS
    ) {
      return response?.data?.fetchAllFiltersInAdminCompliancesList?.data;
    } else {
      return false;
    }
  } catch (error: any) {
    return false;
  }
}

export async function postModifiedCompliancesList(postData: any): Promise<any> {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation SwitchComplianceChecks(
          $payload: SwitchComplianceChecksInput!
        ) {
          switchComplianceChecks(payload: $payload) {
            data
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.switchComplianceChecks?.status === SUCCESS) {
      return true;
    }
    if (response?.data?.switchComplianceChecks?.status === ERROR) {
      toast.error(response?.data?.switchComplianceChecks?.message);
      return false;
    }
  } catch (error: any) {
    return false;
  }
}

export async function fetchFiltersForAdminCompliance(
  postData: any
): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query FetchFiltersForAdminCompliance(
          $payload: FetchFiltersForComplianceInput!
        ) {
          fetchFiltersForAdminCompliance(payload: $payload) {
            data {
              account_list {
                account_type
                name
                opening_date
                value
              }
              account_type_list {
                name
                value
              }
              company_list {
                name
                value
              }
              project_list {
                name
                value
              }
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache", // Optional, depending on your needs
    });

    if (response?.data?.fetchFiltersForAdminCompliance?.status === SUCCESS) {
      return response?.data?.fetchFiltersForAdminCompliance?.data;
    } else {
      return false;
    }
  } catch (error: any) {
    return false;
  }
}
