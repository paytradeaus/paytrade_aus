import { SOMETHING_WENT_WRONG } from "../../message";
import {
  ApolloClient,
  DefaultOptions,
  InMemoryCache,
  createHttpLink,
  gql,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { toast } from "react-toastify";
import { Interface } from "readline";
import { client } from "./adminApi";
import apolloClient from "@/network/apolloClient";

// CompanyService.ts

export const checkCompanyExistence = async (
  companyKeyword: string,
  matchFull?: boolean,
  token?: string
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
    return response.data.checkCompanyExistence?.data || [];
  } catch (error: any) {
    // Handle errors appropriately, for example, show a toast notification
    console.error("GraphQL Error:", error);
    return [];
  }
};

export const insertEmailVerificationDetails = async (inputData: Object) => {
  try {
    const response = await client.mutate({
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

    // Handle the response as needed
    if (response?.data?.insertEmailVerificationDetails?.status === "SUCCESS") {
      return true;
    }
    if (response?.data?.insertEmailVerificationDetails?.status === "ERROR") {
      toast.error(
        response?.data?.insertEmailVerificationDetails?.message ||
          SOMETHING_WENT_WRONG
      );
      return false;
    }
    // Return the array of company profiles with logos
    return false;
  } catch (error) {
    // Handle errors
    console.error("Error in insertEmailVerificationDetails:", error);
    throw error;
  }
};

export const insertCompanyDetails = async (
  inputData: Object,
  token?: string
): Promise<any> => {
  try {
    console.error("Input Data1:", inputData);
    const response = await client.mutate({
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
      return response?.data?.insertCompanyDetails?.data;
    }
    if (response?.data?.insertCompanyDetails?.status === "ERROR") {
      toast.error(response?.data?.insertCompanyDetails?.message);
      return null;
    }
    // Return the array of company profiles with logos
    return null;
  } catch (error) {
    // Handle errors
    console.error("Error in insertCompanyDetails:", error);
    console.error("Input Data:", inputData);
    throw error;
  }
};

export const getAuthToken = async (
  emailId: string,
  isAdmin: boolean
): Promise<string | null> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetAuthToken($emailId: String!, $isAdmin: Boolean!) {
          getAuthToken(email_id: $emailId, is_admin: $isAdmin) {
            data {
              access_token
            }
            message
            status
          }
        }
      `,
      variables: {
        emailId: emailId,
        isAdmin: isAdmin,
      },
    });

    // Return the access token
    return response.data?.getAuthToken?.data?.access_token || null;
  } catch (error) {
    // Handle errors appropriately, for example, show a toast notification
    throw error;
  }
};

export interface InvitationItem {
  decline_count: number;
  email_id: string;
  id: string;
  is_admin_requested: boolean;
  requested_by: string;
  user_action: string;
  user_name: string;
  company_id: number;
  user_id: number;
  status: string;
}

export const getInvitationListsForCompany = async (
  data: {
    companyId: number | null;
    pageNumber: number;
    pageSize: number;
    type: string;
    search: string;
  },
  token?: string,
  setLoading?: Function
): Promise<
  { total_count: number; invitation_list: InvitationItem[] } | any
> => {
  try {
    const response = await client.query({
      query: gql`
        query GetInvitationListsForCompany(
          $pageNumber: Float!
          $pageSize: Float!
          $type: String!
          $companyId: Float
          $search: String
        ) {
          getInvitationListsForCompany(
            pageNumber: $pageNumber
            pageSize: $pageSize
            type: $type
            companyId: $companyId
            search: $search
          ) {
            data {
              invitation_list {
                company_id
                decline_count
                email_id
                id
                is_admin_requested
                requested_by
                user_action
                user_id
                user_name
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: {
        companyId: data.companyId,
        pageNumber: data.pageNumber,
        pageSize: data.pageSize,
        type: data.type,
        search: data.search,
      },
    });

    // Log the data from the response

    // Return relevant data from the response
    return response?.data?.getInvitationListsForCompany?.data || null;
  } catch (error: any) {
    // Handle errors appropriately, for example, show a toast notification
    toast.error(error.message || "Something went wrong in API");
    console.error("GraphQL Error in getInvitationListsForCompany:", error);
    throw error;
  } finally {
    setLoading && setLoading(false);
  }
};

export const getUserByEmailId = async (
  companyId: any,
  emailId: string,
  token?: string
): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query GetUserByEmailId($companyId: Float!, $emailId: String!) {
          getUserByEmailId(companyId: $companyId, emailId: $emailId) {
            data {
              company_id
              date_added
              email_id
              file
              file_name
              file_path
              file_type
              first_name
              id
              is_verified
              last_name
              manage_company
              manage_project_trust_payment
              manage_subscription
              manage_user
              status
              user_id
              user_name
              user_status
              user_type
            }
            message
            status
          }
        }
      `,
      variables: {
        companyId: companyId,
        emailId: emailId,
      },
    });

    return response?.data?.getUserByEmailId?.data || [];
  } catch (error) {
    // Handle errors appropriately, for example, show a toast notification
    console.error("GraphQL Error in getUserByEmailId:", error);
    toast.error("Error searching for user. Please try again later.");
    throw error;
  }
};

type CompanyProfile = {
  company_email_id: string;
  company_id: number | null;
  company_name: string;
  file: string;
  file_path: string;
  file_type: string;
  is_verified: boolean;
  user_id: string;
  status: string;
  requested_count: any;
  last_sent_on: any;
  joined_on: any;
  isPersonalProfile?: boolean;
};

export type { CompanyProfile };

export const getCompanyProfilesWithLogos = async (): Promise<
  CompanyProfile[] | any
> => {
  try {
    const response = await client.query({
      query: gql`
        query GetCompanyProfilesWithLogos {
          getCompanyProfilesWithLogos {
            data {
              company_address
              company_email_id
              company_id
              company_name
              company_role
              decline_count
              entity_type
              expiry_date
              file
              file_path
              file_type
              is_admin_requested
              is_verified
              joined_on
              last_sent_on
              manage_company
              manage_project_trust_payment
              manage_subscription
              manage_user
              plan_name
              plan_type
              requested_count
              status
              user_action
              user_id
            }
            message
            status
          }
        }
      `,
    });
    if (response?.data?.getCompanyProfilesWithLogos?.status === "SUCCESS") {
      return response?.data?.getCompanyProfilesWithLogos?.data;
    }
    if (response?.data?.getCompanyProfilesWithLogos?.status === "ERROR") {
      toast.error(
        response?.data?.getCompanyProfilesWithLogos?.message ||
          SOMETHING_WENT_WRONG
      );
      return [];
    }
    // Return the array of company profiles with logos
    return [];
  } catch (error) {
    // Handle errors appropriately, for example, show a toast notification
    console.error("GraphQL Error in getCompanyProfilesWithLogos:", error);
    return [];
  }
};

interface CreateUserAccessInput {
  user_id?: any;
  // Add other properties as needed
}

interface CreateUserAccessResponse {
  createUserAccessInput: {
    user_name: string;
    user_id: number;
    company_id: number;
    is_user_exists: boolean;
    created_on: string;
    created_by: string;
    email_id: string;
    user_first_name: string;
    company_role: string;
    manage_user: string;
    manage_company: string;
    manage_project_trust_payment: string;
    manage_subscription: string;
    // Add other properties as needed
  };
}

export const insertCompanyUserRoles = async (
  createUserAccessInput: CreateUserAccessInput,
  token?: string
): Promise<any | CreateUserAccessResponse> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation InsertCompanyUserRoles(
          $createUserAccessInput: CreateUserAccessInput!
        ) {
          insertCompanyUserRoles(
            createUserAccessInput: $createUserAccessInput
          ) {
            message
            status
          }
        }
      `,
      variables: {
        createUserAccessInput,
      },
    });
    if (response?.data?.insertCompanyUserRoles?.status === "SUCCESS") {
      return response?.data?.insertCompanyUserRoles?.message || 0;
    }
    if (response?.data?.insertCompanyUserRoles?.status === "ERROR") {
      toast.error(response?.data?.insertCompanyUserRoles?.message);
    }

    // Log or handle the response data

    // You can perform further actions based on the response if needed
  } catch (error) {
    // Handle errors appropriately, for example, show a toast notification
    console.error("GraphQL Error in insertCompanyUserRoles:", error);
    toast.error("Error inserting business user roles. Please try again later.");
    throw error;
  }
};

export interface CreateNewUserAccessInputs extends CreateUserAccessInput {
  user_name: string;
  company_id: number;
  is_user_exists: boolean;
  // created_on: string;
  // created_by: string;
  email_id: string;
  user_first_name: string;
  company_role: string;
  manage_user: string;
  manage_company: string;
  manage_project_trust_payment: string;
  manage_subscription: string;
}

export const insertCompanyNewUserRoles = async (
  createUserAccessInput: CreateNewUserAccessInputs,
  token?: string
): Promise<any> => {
  try {
    // Execute the GraphQL mutation using the Apollo Client
    const response = await client.mutate({
      mutation: gql`
        mutation InsertCompanyUserRoles(
          $createUserAccessInput: CreateUserAccessInput!
        ) {
          insertCompanyUserRoles(
            createUserAccessInput: $createUserAccessInput
          ) {
            message
            status
          }
        }
      `,
      variables: {
        createUserAccessInput,
      },
    });

    // Notify success
    if (response?.data?.insertCompanyUserRoles?.status === "SUCCESS") {
      return response?.data?.insertCompanyUserRoles?.message || 0;
    }
    if (response?.data?.insertCompanyUserRoles?.status === "ERROR") {
      toast.error(response?.data?.insertCompanyUserRoles?.message);
    }
  } catch (error: any) {
    // Handle errors appropriately, for example, show a toast notification
    toast.error(error.message || "Something went wrong in API");
    console.error("GraphQL Error in insertCompanyUserRoles:", error);
    throw error;
  }
};

export const updatePrimaryAdmin = async (
  companyId: number | null,
  userId: number,
  token?: string
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation UpdatePrimaryAdmin($companyId: Float!, $userId: Float!) {
          updatePrimaryAdmin(company_id: $companyId, user_id: $userId) {
            message
            status
          }
        }
      `,
      variables: {
        companyId: companyId,
        userId: userId,
      },
    });

    if (response?.data?.updatePrimaryAdmin?.status === "SUCCESS") {
      toast.success(response?.data?.updatePrimaryAdmin?.message);
      return true;
    }
    if (response?.data?.updatePrimaryAdmin?.status === "ERROR") {
      toast.error(
        response.data.updatePrimaryAdmin?.message || SOMETHING_WENT_WRONG
      );
      return false;
    }
    return false;
  } catch (error) {
    // Handle errors appropriately, for example, show a toast notification
    console.error("GraphQL Error in updatePrimaryAdmin:", error);
    throw error;
  }
};

export const deleteUserFromCompany = async (
  companyId: number | null,
  userId: number
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation DeleteUserFromCompany($companyId: Float!, $userId: Float!) {
          deleteUserFromCompany(company_id: $companyId, user_id: $userId) {
            message
            status
          }
        }
      `,
      variables: {
        companyId: companyId,
        userId: userId,
      },
    });

    // Log the data from the response

    // Return relevant data from the response
    // return response.data.deleteUserFromCompany?.message;

    if (response?.data?.deleteUserFromCompany?.status === "SUCCESS") {
      toast.success(response?.data?.deleteUserFromCompany?.message);
      return true;
    }
    if (response?.data?.deleteUserFromCompany?.status === "ERROR") {
      toast.error(
        response.data.deleteUserFromCompany?.message || SOMETHING_WENT_WRONG
      );
      return false;
    }
    return false;
  } catch (error) {
    // Handle errors appropriately, for example, show a toast notification
    console.error("GraphQL Error in deleteUserFromCompany:", error);
    throw error;
  }
};

export const updateAcceptOrDecline = async (
  companyId: number | null,
  isAdmin: boolean,
  userAction: string,
  userEmail: string,
  userId: number,
  msg?: string
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation UpdateAcceptOrDecline(
          $companyId: Float!
          $isAdmin: Boolean!
          $userAction: String!
          $userEmail: String!
          $userId: Float!
        ) {
          updateAcceptOrDecline(
            company_id: $companyId
            is_admin: $isAdmin
            user_action: $userAction
            user_email: $userEmail
            user_id: $userId
          ) {
            message
            status
          }
        }
      `,
      variables: {
        companyId: companyId,
        isAdmin: isAdmin,
        userAction: userAction,
        userEmail: userEmail,
        userId: userId,
      },
    });

    // Log the data from the response

    if (response?.data?.updateAcceptOrDecline?.status === "SUCCESS") {
      toast.success(msg);
      return true;
    }
    if (response?.data?.updateAcceptOrDecline?.status === "ERROR") {
      toast.error(
        response.data.updateAcceptOrDecline?.message || SOMETHING_WENT_WRONG
      );
      return false;
    }
    return false;
  } catch (error) {
    // Handle errors appropriately, for example, show a toast notification
    console.error("GraphQL Error in updateAcceptOrDecline:", error);
    throw error;
  }
};

export const checkCompanyInviteAndUpdate = async (): Promise<string> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation CheckCompanyInviteAndUpdate {
          checkCompanyInviteAndUpdate {
            message
            status
          }
        }
      `,
    });

    // Log the data from the response

    // Return relevant data from the response
    return response.data.checkCompanyInviteAndUpdate?.message;
  } catch (error) {
    // Handle errors appropriately, for example, show a toast notification
    console.error("GraphQL Error in checkCompanyInviteAndUpdate:", error);
    throw error;
  }
};

export const requestToJoinCompany = async (
  createUserAccessInput: CreateUserAccessInput,
  token?: string
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation RequestToJoinCompany(
          $createUserAccessInput: CreateJoinUserAccessInput!
        ) {
          requestToJoinCompany(createUserAccessInput: $createUserAccessInput) {
            message
            status
          }
        }
      `,
      variables: {
        createUserAccessInput,
      },
    });

    // Log the data from the response
    if (response?.data?.requestToJoinCompany?.status === "SUCCESS") {
      return response?.data?.requestToJoinCompany?.message;
    }
    if (response?.data?.requestToJoinCompany?.status === "ERROR") {
      toast.error(
        response?.data?.requestToJoinCompany?.message || SOMETHING_WENT_WRONG
      );
      return false;
    }
    return false;
  } catch (error) {
    // Handle errors appropriately, for example, show a toast notification
    console.error("GraphQL Error in requestToJoinCompany:", error);
    throw error;
  }
};

interface UpdateUserAccessInput {
  user_name: string;
  user_id: number;
  status: string;
  company_role: string;
  company_id: number;
  manage_company: string;
  manage_project_trust_payment: string;
  manage_user: string;
  manage_subscription: string;
  updated_by: string;
  updated_on: string;
}

export const editUserFromCompany = async (
  updateUserAccessInput: UpdateUserAccessInput,
  token?: string
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation EditUserFromCompany(
          $updateUserAccessInput: UpdateUserAccessInput!
        ) {
          editUserFromCompany(updateUserAccessInput: $updateUserAccessInput) {
            message
            status
          }
        }
      `,
      variables: {
        updateUserAccessInput,
      },
    });
    // Log the data from the response
    if (response?.data?.editUserFromCompany?.status === "SUCCESS") {
      return true;
    }
    if (response?.data?.editUserFromCompany?.status === "ERROR") {
      toast.error(
        response?.data?.editUserFromCompany?.message || SOMETHING_WENT_WRONG
      );
      return false;
    }
    return false;
  } catch (error) {
    // Handle errors appropriately, for example, show a toast notification
    console.error("GraphQL Error in editUserFromCompany:", error);
    throw error;
  }
};

export const insertSubscriptionDetails = async (
  inputData: Object,
  successMsg?: string,
  token?: string
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation InsertSubscriptionDetails(
          $createSubscriptionInput: CreateSubscriptionInput!
        ) {
          insertSubscriptionDetails(
            createSubscriptionInput: $createSubscriptionInput
          ) {
            message
            status
          }
        }
      `,
      variables: {
        createSubscriptionInput: inputData,
      },
    });
    return response.data;
  } catch (error: any) {
    // Handle errors
    toast.error(error?.message);
  }
};
