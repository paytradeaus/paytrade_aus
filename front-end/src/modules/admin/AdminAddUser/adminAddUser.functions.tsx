import { client } from "@/app/api/adminApi/adminApi";
import { ERROR, SOMETHING_WENT_WRONG, SUCCESS } from "@/app/message";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { gql } from "@apollo/client";

export const AdminUpdateUser = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation AdminUpdateUser($updateAdminInput: UpdateUserDetailsInput!) {
          adminUpdateUser(updateAdminInput: $updateAdminInput) {
            status
            message
            data {
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
        }
      `,
      variables: {
        updateAdminInput: {
          ...data,
        },
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.adminUpdateUser?.status === SUCCESS) {
      showSuccessToast(successMsg || "User updated successfully");
      return true;
    }
    if (response?.data?.adminUpdateUser?.status === ERROR) {
      console.error(response?.data?.adminUpdateUser?.message);
      showErrorToast(response?.data?.adminUpdateUser?.message);
      return false;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};

export const AdminGetUserById = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query Data($userId: Float!) {
          adminGetUserById(user_id: $userId) {
            status
            message
            data {
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
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.adminGetUserById?.status === SUCCESS) {
      return response?.data?.adminGetUserById?.data;
    }
    if (response?.data?.adminGetUserById?.status === ERROR) {
      console.error(response?.data?.adminGetUserById?.message);
      showErrorToast(response?.data?.adminGetUserById?.message);
      return {};
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return {};
  } finally {
    setLoading && setLoading(false);
  }
};

export const AdminCreateUserDetails = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation AdminCreateUserDetails(
          $adminCreateUserInput: AdminCreateUserInput!
        ) {
          AdminCreateUserDetails(adminCreateUserInput: $adminCreateUserInput) {
            message
            status
            data {
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
        }
      `,
      variables: {
        adminCreateUserInput: {
          ...data,
          user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.AdminCreateUserDetails?.status === SUCCESS) {
      showSuccessToast(successMsg || "User added successfully");
      return true;
    }
    if (response?.data?.AdminCreateUserDetails?.status === ERROR) {
      console.error(response?.data?.AdminCreateUserDetails?.message);
      showErrorToast(response?.data?.AdminCreateUserDetails?.message);
      return false;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};
