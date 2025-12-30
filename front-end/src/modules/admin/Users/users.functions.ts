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
                first_name
                id
                is_admin_contacted
                last_name
                latitude
                longitude
                occupation
                place_id
                position_title
                region
                user_address
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
