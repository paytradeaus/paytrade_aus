import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";

export const AdminListAllUsers = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query AdminlistAllUsers(
          $keyword: String
          $page: Int
          $perPage: Int
          $sortingField: String
          $sortingOrder: String
          $status: String
        ) {
          adminlistAllUsers(
            keyword: $keyword
            page: $page
            perPage: $perPage
            sortingField: $sortingField
            sortingOrder: $sortingOrder
            status: $status
          ) {
            data {
              totalCount
              users {
                company_name
                country
                created_on
                email_id
                expiry_date
                first_name
                free_plan_reason
                id
                is_admin_contacted
                is_free_plan_eligible
                last_name
                latitude
                longitude
                occupation
                place_id
                plan_id
                plan_name
                position_title
                region
                subscription_id
                subscription_status
                user_address
                user_company_id
                user_company_name
                user_id
                user_phone_no
                user_role
                user_status
              }
            }
            message
            status
          }
        }
      `,
      variables: {
        page: data.page,
        perPage: data.perPage,
        keyword: data.keyWord,
        status: data.status,
        sortingOrder: data?.sortingOrder,
        sortingField: data?.sortingField,
      },
      fetchPolicy: "no-cache",
    });
    if (
      response &&
      response?.data?.adminlistAllUsers?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.adminlistAllUsers?.data;
    }
    if (
      response &&
      response?.data?.adminlistAllUsers?.status === ApiResponse.ERROR
    ) {
      console.error(response && response?.data?.adminlistAllUsers?.message);
      return null;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const AdminResetUserPassword = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation AdminUpdateUser($id: String!) {
          adminResetUserPassword(Id: $id) {
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
    if (
      response?.data?.adminResetUserPassword?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(
        successMsg || response?.data?.resetAdminPassword?.message
      );
      return true;
    }
    if (response?.data?.adminResetUserPassword?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.adminResetUserPassword?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error?.message || ApiResponse.SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};

export const GenerateBotUsers = async (count: number = 5): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation GenerateBotUsers($count: Float!) {
          generateBotUsers(count: $count)
        }
      `,
      variables: { count },
    });
    return response?.data?.generateBotUsers;
  } catch (error: any) {
    console.log("GenerateBotUsers ~ error:", error);
    return null;
  }
};

export const AdminGetUserDependencies = async (
  userId: number
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query AdminGetUserDependencies($user_id: Float!) {
          adminGetUserDependencies(user_id: $user_id) {
            status
            message
          }
        }
      `,
      variables: { user_id: userId },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.adminGetUserDependencies?.status === ApiResponse.SUCCESS) {
      return JSON.parse(response.data.adminGetUserDependencies.message);
    }
    return null;
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return null;
  }
};

export const AdminDeleteUser = async (
  userId: number
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation AdminDeleteUser($user_id: Float!) {
          adminDeleteUser(user_id: $user_id) {
            status
            message
          }
        }
      `,
      variables: { user_id: userId },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.adminDeleteUser?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response.data.adminDeleteUser.message);
      return true;
    }
    if (response?.data?.adminDeleteUser?.status === ApiResponse.ERROR) {
      showErrorToast(response.data.adminDeleteUser.message);
      return false;
    }
    return false;
  } catch (error: any) {
    showErrorToast(error?.message || "Failed to delete user");
    console.error("GraphQL Error:", error);
    return false;
  }
};

export const AllowAdminToLoginAsUser = async (
  data: any,
  successMsg?: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        query AllowAdminToLoginAsUser($payload: AllowAdminToLoginAsUserInput!) {
          allowAdminToLoginAsUser(payload: $payload) {
            data {
              access_token
            }
            message
            status
          }
        }
      `,
      variables: {
        payload: data,
      },
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.allowAdminToLoginAsUser?.status === ApiResponse.SUCCESS
    ) {
      showErrorToast(response?.data?.resetAdminPassword?.message);
      return response?.data?.allowAdminToLoginAsUser?.data;
    }
    if (response?.data?.allowAdminToLoginAsUser?.status === ApiResponse.ERROR) {
      return response?.data?.allowAdminToLoginAsUser?.message;
    }
  } catch (error: any) {
    showErrorToast(error?.message || "something went wrong in API");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
