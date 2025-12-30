import apolloClient from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

export async function ListAllSubPayments(postData: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query ListAllSubPayments($payload: ListSubPaymentsInput!) {
          listAllSubPayments(payload: $payload) {
            data {
              total_count
              payments {
                amount
                cash_retention_type
                claim_amount
                claim_type
                contract_id
                contract_name
                due_date
                formatted_amount
                formatted_claim_amount
                formatted_received_amount
                formatted_spent_amount
                id
                is_late
                is_paid_confirmed
                is_received_confirmed
                is_retention_confirmed
                payment_claim_id
                payment_date
                payment_from_account
                payment_from_account_name
                payment_id
                payment_to_account
                payment_to_account_bsb_number
                payment_to_account_name
                payment_to_account_number
                payment_type
                project_id
                project_name
                received_amount
                spent_amount
                status
                sub_payment_id
                sub_payment_type
              }
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.listAllSubPayments?.status === ApiResponse.SUCCESS) {
      return response?.data?.listAllSubPayments?.data;
    }
    if (response?.data?.listAllSubPayments?.status === ApiResponse.ERROR) {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

export async function FetchAllUnsentNoticesOfACompany(
  postData: any
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchAllUnsentNoticesOfACompany(
          $payload: FetchAllUnsentNoticesOfACompanyInput!
        ) {
          fetchAllUnsentNoticesOfACompany(payload: $payload) {
            data {
              bank_account_id
              bank_account_name
              bank_account_type
              notice_id
              id
              notice_type
              status
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
      response?.data?.fetchAllUnsentNoticesOfACompany?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.fetchAllUnsentNoticesOfACompany?.data;
    }
    if (
      response?.data?.fetchAllUnsentNoticesOfACompany?.status ===
      ApiResponse.ERROR
    ) {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

export async function FetchAllComplianceResultsInDashboard(
  postData: any
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchAllComplianceResultsInDashboard(
          $payload: FetchAllComplianceResultsInDashboardInput!
        ) {
          fetchAllComplianceResultsInDashboard(payload: $payload) {
            data {
              bank_account_id
              bank_account_name
              bank_account_type
              number_of_issues
              project_id
              project_name
              project_status
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
      response?.data?.fetchAllComplianceResultsInDashboard?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.fetchAllComplianceResultsInDashboard?.data;
    } else {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

export async function FetchAllUnmatchedPaymentsOfACompany(
  postData: any
): Promise<any> {
  try {
    // bank_account_type
    const response = await apolloClient.query({
      query: gql`
        query FetchAllUnmatchedPaymentsOfACompany($company_id: Float!) {
          fetchAllUnmatchedPaymentsOfACompany(company_id: $company_id) {
            data {
              account_name
              amount
              formatted_amount
              cash_retention_type
              id
              account_type
              payment_account
              payment_claim_id
              payment_id
              status
              sub_payment_id
              sub_payment_type
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
      response?.data?.fetchAllUnmatchedPaymentsOfACompany?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.fetchAllUnmatchedPaymentsOfACompany?.data;
    }

    if (
      response?.data?.fetchAllUnmatchedPaymentsOfACompany?.status ===
      ApiResponse.ERROR
    ) {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

export const getProjectListsForCompany = async (
  data: any
): Promise<{ total_count: number; project_list: any[] } | any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetProjectListsForCompany(
          $getProjectListsInput: GetProjectListsInput!
        ) {
          getProjectListsForCompany(
            getProjectListsInput: $getProjectListsInput
          ) {
            data {
              project_list {
                company_id
                compliance
                contract_count
                country
                formatted_head_contract_sum
                head_contract_sum
                id
                latitude
                longitude
                number_of_units
                place_id
                project_date
                project_description
                project_id
                project_name
                project_role
                project_status
                pta_compliance
                pta_eligibility
                region
                retention_type
                rta_compliance
                rta_eligibility
                site_address
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.getProjectListsForCompany?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.getProjectListsForCompany?.data;
    }
    if (
      response?.data?.getProjectListsForCompany?.status === ApiResponse.ERROR
    ) {
      return null;
    }
  } catch (error: any) {
    return null;
  }
};

export const setDontShowAgain = async (): Promise<
  { total_count: number; project_list: any[] } | any
> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation UpdateWelcomePop {
          updateWelcomePop {
            data {
              access_token
              refresh_token
            }
            message
            status
          }
        }
      `,
      variables: {},
      fetchPolicy: "no-cache",
    });
    return response?.data?.updateWelcomePop?.data;
  } catch (error: any) {
    return null;
  }
};
