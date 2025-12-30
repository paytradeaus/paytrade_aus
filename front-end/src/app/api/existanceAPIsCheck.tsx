import { gql } from "@apollo/client";
import { client } from "./apolloClientServices";

export const CheckAdminExistence = async (emailId: string): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query CheckAdminExistence($emailId: String!) {
          checkAdminExistence(email_id: $emailId) {
            status
            message
            data {
              admin_role
              admin_status
              created_on
              email_id
              first_name
              id
              last_logged_in
              last_name
            }
          }
        }
      `,
      variables: {
        emailId,
      },
    });
    if (response?.data?.checkAdminExistence?.data?.id) {
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

export const CheckGroupNameExistence = async (
  groupName: string
): Promise<any> => {
  try {
    const response = await client.query({
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
    // Handle GraphQL errors
    console.error("GraphQL Error:", error);
    return false;
  }
};

export const CheckUserExistence = async (emailId: string): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query CheckUserExistence($emailId: String!) {
          checkUserExistence(email_id: $emailId) {
            data {
              email_id
              is_verified
              last_logged_in
              user_status
            }
            message
            status
          }
        }
      `,
      variables: {
        emailId,
      },
    });
    if (response?.data?.checkUserExistence?.data[0]?.email_id) {
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

export const CheckCompanyExistence = async (
  companyKeyword: string,
  matchFull?: boolean
): Promise<any> => {
  try {
    const response = await client.query({
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
    if (response?.data?.checkCompanyExistence?.data[0]?.company_id) {
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

export const CheckQbccExistence = async (qbccNumber: string): Promise<any> => {
  try {
    const response = await client.query({
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
    console.error("GraphQL Error:", error);
    return false;
  }
};

export const CheckCompanyEmailExistence = async (
  email: string
): Promise<any> => {
  try {
    const response = await client.query({
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
    console.error("GraphQL Error in checkCompanyEmailExistence:", error);
    return "";
  }
};
export const CheckSubscriptionPlanNameExistence = async (
  planName: string
): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query CheckSubscriptionPlanExistence($keyword: String!) {
          checkSubscriptionPlanExistence(keyword: $keyword) {
            data {
              description
              id
              plan_id
              plan_name
              plan_status
              plan_type
              stripe_product_id
            }
            message
            status
          }
        }
      `,
      variables: {
        keyword: planName,
      },
    });
    if (response?.data?.checkSubscriptionPlanExistence?.data?.length > 0) {
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

export const CheckBlogResourceNameExistence = async (
  planName: string
): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query CheckBlogResourceNameExistence($blogResName: String!) {
          checkBlogResourceNameExistence(blog_res_name: $blogResName) {
            data {
              id
              title
            }
            message
            status
          }
        }
      `,
      variables: {
        blogResName: planName,
      },
    });
    if (response?.data?.checkBlogResourceNameExistence?.data?.id) {
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

export const CheckExistenceOfBankAccountNumber = async (
  accNumber: string
): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query CheckExistenceOfBankAccountNumber(
          $payload: CheckExistenceOfBankAccountNumberInput!
        ) {
          checkExistenceOfBankAccountNumber(payload: $payload) {
            data {
              is_present
            }
            message
            status
          }
        }
      `,
      variables: {
        payload: {
          bank_account_number: accNumber,
        },
      },
    });
    if (response?.data?.checkExistenceOfBankAccountNumber?.data?.is_present) {
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

export const CheckFinInstitutionExistence = async (
  institutionCode: string
): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query CheckFinInstitutionExistence($institutionCode: String!) {
          checkFinInstitutionExistence(institution_code: $institutionCode) {
            data {
              id
            }
            message
            status
          }
        }
      `,
      variables: {
        institutionCode: institutionCode,
      },
    });
    if (response?.data?.checkFinInstitutionExistence?.data?.id) {
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
    const response = await client.query({
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

export const CheckFinInstitutionNameExistence = async (
  institutionName: string
): Promise<any> => {
  try {
    const response = await client.query({
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
