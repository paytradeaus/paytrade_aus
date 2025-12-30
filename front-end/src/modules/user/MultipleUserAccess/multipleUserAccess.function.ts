import { client } from "@/app/api/adminApi/adminApi";
import { SOMETHING_WENT_WRONG } from "@/app/message";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { gql } from "@apollo/client";
interface UserType {
  date_added: string;
  email_id: string;
  id: string;
  status: string;
  user_id: string;
  user_name: string;
  user_type: string;
}
export const getUserListsForCompany = async (
  data: any,
  setLoading?: Function
): Promise<{ total_count: number; user_list: UserType[] } | any> => {
  try {
    const response = await client.query({
      query: gql`
        query GetUserListsForCompany(
          $companyId: Float!
          $pageNumber: Float!
          $pageSize: Float!
          $search: String
        ) {
          getUserListsForCompany(
            companyId: $companyId
            pageNumber: $pageNumber
            pageSize: $pageSize
            search: $search
          ) {
            data {
              pending_invitations
              total_count
              user_list {
                date_added
                email_id
                id
                manage_company
                manage_project_trust_payment
                manage_subscription
                manage_user
                status
                user_id
                user_name
                user_type
              }
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
        search: data.search,
      },
      fetchPolicy: "no-cache",
    });
    return response?.data?.getUserListsForCompany?.data || null;
  } catch (error: any) {
    showErrorToast(error.message || "something went wrong in API");
    console.error("GraphQL Error:", error);
    return [];
  } finally {
    setLoading && setLoading(false);
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
  company_name: string;
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
                company_name
                decline_count
                email_id
                id
                is_admin_requested
                requested_by
                user_action
                user_id
                user_name
                admin_name
                admin_email
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
    showErrorToast(error.message || "Something went wrong in API");
    console.error("GraphQL Error in getInvitationListsForCompany:", error);
    throw error;
  } finally {
    setLoading && setLoading(false);
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
      showSuccessToast(msg || "");
      return true;
    }
    if (response?.data?.updateAcceptOrDecline?.status === "ERROR") {
      showErrorToast(
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
      showSuccessToast(response?.data?.deleteUserFromCompany?.message);
      return true;
    }
    if (response?.data?.deleteUserFromCompany?.status === "ERROR") {
      showErrorToast(
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
      showSuccessToast(response?.data?.updatePrimaryAdmin?.message);
      return true;
    }
    if (response?.data?.updatePrimaryAdmin?.status === "ERROR") {
      showErrorToast(
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
