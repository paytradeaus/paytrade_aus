import { client } from "@/app/api/apolloClientServices";
import { ERROR, SUCCESS } from "@/common/constants/messages";
import { gql } from "@apollo/client";

export async function fetchPaymentsToDo(postData: any): Promise<any> {
  try {
    const response = await client.query({
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

    if (response?.data?.listAllSubPayments?.status === SUCCESS) {
      return response?.data?.listAllSubPayments?.data;
    }
    if (response?.data?.listAllSubPayments?.status === ERROR) {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

export async function fetchUnsentNotices(postData: any): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query FetchAllUnsentNoticesOfACompany(
          $payload: FetchAllUnsentNoticesOfACompanyInput!
        ) {
          fetchAllUnsentNoticesOfACompany(payload: $payload) {
            data {
              bank_account_id
              bank_account_name
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

    if (response?.data?.fetchAllUnsentNoticesOfACompany?.status === SUCCESS) {
      return response?.data?.fetchAllUnsentNoticesOfACompany?.data;
    }
    if (response?.data?.fetchAllUnsentNoticesOfACompany?.status === ERROR) {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

export async function fetchCompliances(postData: any): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query FetchAllComplianceResultsInDashboard(
          $payload: FetchAllComplianceResultsInDashboardInput!
        ) {
          fetchAllComplianceResultsInDashboard(payload: $payload) {
            data {
              bank_account_id
              bank_account_name
              number_of_issues
              project_id
              project_name
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
      response?.data?.fetchAllComplianceResultsInDashboard?.status === SUCCESS
    ) {
      return response?.data?.fetchAllComplianceResultsInDashboard?.data;
    } else {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

export async function fetchUnmatchedTransactions(postData: any): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query FetchAllUnmatchedPaymentsOfACompany($company_id: Float!) {
          fetchAllUnmatchedPaymentsOfACompany(company_id: $company_id) {
            data {
              account_name
              amount
              formatted_amount
              id
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
      response?.data?.fetchAllUnmatchedPaymentsOfACompany?.status === SUCCESS
    ) {
      return response?.data?.fetchAllUnmatchedPaymentsOfACompany?.data;
    }
    if (response?.data?.fetchAllUnmatchedPaymentsOfACompany?.status === ERROR) {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}
