import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import apolloClient from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

export async function AdminFetchListOfAllMenus(): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query AdminfetchListOfAllMenus {
          adminfetchListOfAllMenus {
            data {
              id
              menu_description
              menu_name
            }
            message
            status
          }
        }
      `,
      fetchPolicy: "no-cache",
    });

    if (
      response &&
      response?.data?.adminfetchListOfAllMenus?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.adminfetchListOfAllMenus?.data;
    }

    if (
      response &&
      response?.data?.adminfetchListOfAllMenus?.status === ApiResponse.ERROR
    ) {
      return null;
    }
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.ERROR);

    return null;
  }
}
export async function InsertAdminGroupDetails(
  data: any,
  successMsg: string
): Promise<any> {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation InsertAdminGroupDetails($addPtGroupInput: AddGroupInput!) {
          insertAdminGroupDetails(addPTGroupInput: $addPtGroupInput) {
            status
            message
            data {
              created_on
              group_description
              group_name
              group_status
              id
            }
          }
        }
      `,
      variables: {
        addPtGroupInput: data,
      },
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.insertAdminGroupDetails?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(successMsg || "group added successfully");
      return true;
    } else if (
      response?.data?.insertAdminGroupDetails?.status === ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.insertAdminGroupDetails?.message);
      return false;
    }
  } catch (error: any) {
    return false;
  }
}
export async function GetGroupDetailsById(data: { id: string }): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetGroupDetailsById($id: String!) {
          getGroupDetailsById(Id: $id) {
            data {
              created_on
              group_description
              group_name
              group_status
              id
              menuPrivileges {
                allPermission
                deletePermission
                exportPermission
                insertPermission
                listPermission
                menuId
                menuName
                printPermission
                updatePermission
                viewPermission
              }
            }
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
    if (response?.data?.getGroupDetailsById?.status === ApiResponse.SUCCESS) {
      return response?.data?.getGroupDetailsById?.data;
    } else if (
      response?.data?.getGroupDetailsById?.status === ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.getGroupDetailsById?.message);
      return {};
    }
  } catch (error: any) {
    return {};
  }
}
export async function UpdateGroupDetails(
  data: any,
  successMsg: string
): Promise<any> {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation Mutation($updateAdminInput: UpdateGroupInput!) {
          updateGroupDetails(updateAdminInput: $updateAdminInput) {
            status
            message
            data {
              created_on
              group_description
              group_name
              group_status
              id
            }
          }
        }
      `,
      variables: {
        updateAdminInput: data,
      },
      // fetchPolicy: "no-cache",
    });

    if (response?.data?.updateGroupDetails?.status === ApiResponse.SUCCESS) {
      showSuccessToast(successMsg || "Group updated successfully");
      return true;
    }
    if (response?.data?.updateGroupDetails?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.updateGroupDetails?.message);
      return false;
    }
  } catch (error: any) {
    return false;
  }
}
