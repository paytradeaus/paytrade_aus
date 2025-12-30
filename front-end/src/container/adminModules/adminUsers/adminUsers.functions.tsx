import { gql } from "@apollo/client";
import { toast } from "@/app/Toaster";
import { client } from "@/app/api/apolloClientServices";
import { AdminUserData } from "./adminUsers.types";
import {
  ERROR,
  SOMETHING_WENT_WRONG,
  SUCCESS,
} from "@/common/constants/messages";
export const ListAllAdminsUsers = async (
  data: any,
  setLoading?: Function
): Promise<{ admins: AdminUserData[]; totalCount: number } | any> => {
  try {
    const response = await client.query({
      query: gql`
        query ListAllAdmins(
          $keyword: String
          $page: Int
          $perPage: Int
          $status: String
        ) {
          listAllAdmins(
            keyword: $keyword
            page: $page
            perPage: $perPage
            status: $status
          ) {
            message
            status
            data {
              admins {
                admin_role
                admin_status
                created_on
                email_id
                first_name
                id
                last_logged_in
                last_name
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
    if (response && response?.data?.listAllAdmins?.status === SUCCESS) {
      return response?.data?.listAllAdmins?.data;
    }
    if (response && response?.data?.listAllAdmins?.status === ERROR) {
      console.error(response && response?.data?.listAllAdmins?.message);
      return null;
    }
  } catch (error: any) {
    // toast.error(error?.message || SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const ResetAdminPassword = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation ResetAdminPassword($id: String!) {
          resetAdminPassword(Id: $id) {
            status
            message
          }
        }
      `,
      variables: {
        ...data,
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.resetAdminPassword?.status === SUCCESS) {
      toast.success(successMsg || response?.data?.resetAdminPassword?.message);
      return true;
    }
    if (response?.data?.resetAdminPassword?.status === ERROR) {
      toast.error(response?.data?.resetAdminPassword?.message);
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
