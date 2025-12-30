import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { IAdminUserListDetail } from "./adminUsers.types";

export const ListAllAdminsUsers = async (
  data: any,
  setLoading?: Function
): Promise<{ admins: IAdminUserListDetail[]; totalCount: number } | any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query ListAllAdmins(
          $keyword: String
          $page: Int
          $perPage: Int
          $sortingField: String
          $sortingOrder: String
          $status: String
        ) {
          listAllAdmins(
            keyword: $keyword
            page: $page
            perPage: $perPage
            sortingField: $sortingField
            sortingOrder: $sortingOrder
            status: $status
          ) {
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
                signature
                signature_type
              }
              totalCount
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (
      response &&
      response?.data?.listAllAdmins?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.listAllAdmins?.data;
    }
    if (
      response &&
      response?.data?.listAllAdmins?.status === ApiResponse.ERROR
    ) {
      return null;
    }
  } catch (error: any) {
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
    const response = await apolloClient.mutate({
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
    if (response?.data?.resetAdminPassword?.status === ApiResponse.SUCCESS) {
      showSuccessToast(
        successMsg || response?.data?.resetAdminPassword?.message
      );
      return true;
    }
    if (response?.data?.resetAdminPassword?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.resetAdminPassword?.message);
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
