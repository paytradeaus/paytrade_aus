import { gql } from "@apollo/client";
import { toast } from "@/app/Toaster";
import { client } from "@/app/api/apolloClientServices";
import { ERROR, SUCCESS } from "@/common/constants/messages";

export const AdminlistAllUsers = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query AdminlistAllUsers(
          $page: Int
          $perPage: Int
          $status: String
          $keyword: String
        ) {
          adminlistAllUsers(
            page: $page
            perPage: $perPage
            status: $status
            keyword: $keyword
          ) {
            status
            message
            data {
              users {
                first_name
                last_name
                country
                user_role
                user_status
                user_phone_no
                user_id
                user_address
                region
                position_title
                place_id
                occupation
                longitude
                latitude
                is_admin_contacted
                id
                email_id
                created_on
                company_name
              }
              totalCount
            }
          }
        }
      `,
      variables: {
        page: data.page,
        perPage: data.perPage,
        keyword: data.keyWord,
        status: data.status,
      },
      fetchPolicy: "no-cache",
    });
    if (response && response?.data?.adminlistAllUsers?.status === SUCCESS) {
      return response?.data?.adminlistAllUsers?.data;
    }
    if (response && response?.data?.adminlistAllUsers?.status === ERROR) {
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
    const response = await client.mutate({
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
    if (response?.data?.adminResetUserPassword?.status === SUCCESS) {
      toast.success(successMsg || response?.data?.resetAdminPassword?.message);
      return true;
    }
    if (response?.data?.adminResetUserPassword?.status === ERROR) {
      toast.error(response?.data?.adminResetUserPassword?.message);
      return false;
    }
  } catch (error: any) {
    toast.error(error?.message || "something went wrong in API");
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
    const response = await client.mutate({
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
    if (response?.data?.allowAdminToLoginAsUser?.status === SUCCESS) {
      toast.success(response?.data?.resetAdminPassword?.message);
      return response?.data?.allowAdminToLoginAsUser?.data;
    }
    if (response?.data?.allowAdminToLoginAsUser?.status === ERROR) {
      toast.error(response?.data?.allowAdminToLoginAsUser?.message);
      return null;
    }
  } catch (error: any) {
    toast.error(error?.message || "something went wrong in API");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
