import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

export async function FetchHolidayTableStatus(): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetHolidayTableStatus {
          getHolidayTableStatus {
            data {
              warning
              days_remaining
              latest_holiday_date
              total_active_holidays
              status_message
            }
            message
            status
          }
        }
      `,
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.getHolidayTableStatus?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.getHolidayTableStatus?.data;
    } else {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

export async function FetchAllNewUsers(): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchAllNewUsers {
          fetchAllNewUsers {
            data {
              created_date
              first_name
              last_name
              status
              user_id
            }
            message
            status
          }
        }
      `,

      fetchPolicy: "no-cache",
    });

    if (response?.data?.fetchAllNewUsers?.status === ApiResponse.SUCCESS) {
      return response?.data?.fetchAllNewUsers?.data;
    } else {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

export async function FetchAllNewCompanies(): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchAllNewCompanies {
          fetchAllNewCompanies {
            data {
              company_id
              company_name
              created_date
              status
            }
            message
            status
          }
        }
      `,

      fetchPolicy: "no-cache",
    });

    if (response?.data?.fetchAllNewCompanies?.status === ApiResponse.SUCCESS) {
      return response?.data?.fetchAllNewCompanies?.data;
    } else {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

export async function FetchAllProjectsWithComplianceIssues(): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchAllProjectsWithComplianceIssues {
          fetchAllProjectsWithComplianceIssues {
            data {
              bank_account_id
              bank_account_name
              bank_account_type
              issues
              project_id
              project_name
              pta_compliance
              rta_compliance
            }
            message
            status
          }
        }
      `,

      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.fetchAllProjectsWithComplianceIssues?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.fetchAllProjectsWithComplianceIssues?.data;
    } else {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

export async function fetchAllCompaniesWithFailedSubscriptionStatus(): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchAllCompaniesWithFailedSubscriptionStatus {
          fetchAllCompaniesWithFailedSubscriptionStatus {
            data {
              company_id
              company_name
              transaction_status
              primary_admin_id
              primary_admin_name
              primary_admin_email
            }
            message
            status
          }
        }
      `,
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.fetchAllCompaniesWithFailedSubscriptionStatus?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.fetchAllCompaniesWithFailedSubscriptionStatus
        ?.data;
    } else {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

export async function FetchAllBankAccountsForJournals(): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetAllBankAccountsForJournals(
          $payload: GetAllBankAccountsForJournalsInput!
        ) {
          getAllBankAccountsForJournals(payload: $payload) {
            data {
              account_list {
                account_name
                account_type
                balance_check
                bank_account_id
                closing_balance
                company_id
                company_name
                id
                status
                primary_admin_id
                primary_admin_name
                primary_admin_email
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: {
        payload: {
          company_id: null,
          bank_account_id: null,
          account_type: "",
          status: "",
          balance_check: "Error",
          page_number: null,
          page_size: null,
        },
        fetchPolicy: "no-cache",
      },
    });

    if (
      response?.data?.getAllBankAccountsForJournals?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.getAllBankAccountsForJournals?.data;
    } else {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}
