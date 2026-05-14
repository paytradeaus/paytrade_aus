import { gql } from "@apollo/client";
import apolloClient from "./apolloClient";
import { showErrorToast } from "@/components/Toaster";
import { SOMETHING_WENT_WRONG } from "@/app/message";

async function CheckQbccExistence(qbccNumber: string): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query CheckQbccExistence($qbccNumber: String!) {
          checkQbccExistence(qbcc_number: $qbccNumber) {
            data {
              company_id
              company_name
            }
            message
            status
          }
        }
      `,
      variables: {
        qbccNumber,
      },
    });
    if (response?.data?.checkQbccExistence?.data[0]?.company_id) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    // Handle GraphQL errors

    return false;
  }
}

async function CheckCompanyEmailExistence(email: string): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query CheckCompanyEmailExistence($companyEmail: String!) {
          checkCompanyEmailExistence(company_email: $companyEmail) {
            message
            status
          }
        }
      `,
      variables: {
        companyEmail: email,
      },
    });
    return response?.data?.checkCompanyEmailExistence?.message || "";
  } catch (error: any) {
    // Handle GraphQL errors

    return false;
  }
}

async function checkCompanyExistence(
  companyKeyword: string,
  matchFull?: boolean,
  token?: string
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query CheckCompanyExistence(
          $companyKeyword: String!
          $matchFull: Boolean
        ) {
          checkCompanyExistence(
            company_keyword: $companyKeyword
            match_full: $matchFull
          ) {
            data {
              company_address
              company_email_id
              company_id
              company_name
              country
              entity_type
              file
              file_path
              file_type
              is_verified
              latitude
              legal_company_name
              longitude
              place_id
              region
            }
            message
            status
          }
        }
      `,
      variables: {
        companyKeyword,
        matchFull,
      },
    });
    return response.data.checkCompanyExistence?.data || [];
  } catch (error: any) {
    // Handle errors appropriately, for example, show a toast notification
    console.error("GraphQL Error:", error);
    return [];
  }
}

async function insertEmailVerificationDetails(inputData: Object) {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation InsertEmailVerificationDetails(
          $createEmailVerificationInput: CreateEmailVerificationInput!
        ) {
          insertEmailVerificationDetails(
            createEmailVerificationInput: $createEmailVerificationInput
          ) {
            message
            status
          }
        }
      `,
      variables: {
        createEmailVerificationInput: inputData,
      },
    });
    if (response?.data?.insertEmailVerificationDetails?.status === "SUCCESS") {
      return true;
    }
    if (response?.data?.insertEmailVerificationDetails?.status === "ERROR") {
      showErrorToast(
        response?.data?.insertEmailVerificationDetails?.message ||
          SOMETHING_WENT_WRONG
      );
      return false;
    }
    // Return the array of company profiles with logos
    return false;
  } catch (error) {
    // Re-throw transport/runtime errors so callers can show feedback
    // (ERROR-status responses are handled above and toast inline.)
    throw error;
  }
}

export const CheckFinInstitutionNameExistence = async (
  institutionName: string
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query CheckFinInstitutionNameExistence($institutionName: String!) {
          checkFinInstitutionNameExistence(institution_name: $institutionName) {
            data {
              id
              institution_address
              acc_number_maxlength
            }
            message
            status
          }
        }
      `,
      variables: {
        institutionName: institutionName,
      },
    });
    if (response?.data?.checkFinInstitutionNameExistence?.data?.id) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    // Handle GraphQL errors
    console.error("GraphQL Error:", error);
    return false;
  }
};

export const CheckCurrencyNameExistence = async (
  currencyName: string
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query CheckCurrencyNameExistence($currency: String!) {
          checkCurrencyNameExistence(currency: $currency) {
            data {
              currency_name
              id
            }
            message
            status
          }
        }
      `,
      variables: {
        currency: currencyName,
      },
    });
    if (response?.data?.checkCurrencyNameExistence?.data?.id) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    // Handle GraphQL errors
    console.error("GraphQL Error:", error);
    return false;
  }
};

export {
  CheckQbccExistence,
  CheckCompanyEmailExistence,
  checkCompanyExistence,
  insertEmailVerificationDetails,
};

export async function CheckUserStatus(): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query CheckUserStatus {
          checkUserStatus {
            message
            status
          }
        }
      `,
    });

    if (response?.data?.checkUserStatus?.status === "SUCCESS") {
      return response?.data?.checkUserStatus;
    }
    if (response?.data?.checkUserStatus?.status === "ERROR") {
      return response?.data?.checkUserStatus;
    }
  } catch (error: any) {
    showErrorToast(error.message || SOMETHING_WENT_WRONG);
    return {};
  }
}

export const CheckGroupNameExistence = async (
  groupName: string
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query CheckGroupNameExistence($groupName: String!) {
          checkGroupNameExistence(group_name: $groupName) {
            data {
              created_on
              group_description
              group_name
              group_status
              id
            }
            message
            status
          }
        }
      `,
      variables: {
        groupName,
      },
    });
    if (response?.data?.checkGroupNameExistence?.data?.id) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
};
