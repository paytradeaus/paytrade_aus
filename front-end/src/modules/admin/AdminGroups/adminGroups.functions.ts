import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { IGroupsData } from "./adminGroups.types";

export const listAllGroups = async (
  data?: any,
  setLoading?: Function
): Promise<{ groups: IGroupsData[]; totalCount: number } | any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query ListAllGroups(
          $isAlphabeticalOrder: Boolean
          $keyword: String
          $page: Int
          $perPage: Int
          $sortingField: String
          $sortingOrder: String
          $status: String
        ) {
          listAllGroups(
            isAlphabeticalOrder: $isAlphabeticalOrder
            keyword: $keyword
            page: $page
            perPage: $perPage
            sortingField: $sortingField
            sortingOrder: $sortingOrder
            status: $status
          ) {
            data {
              groups {
                created_on
                group_description
                group_name
                group_status
                id
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
      response?.data?.listAllGroups?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.listAllGroups?.data;
    }
    if (
      response &&
      response?.data?.listAllGroups?.status === ApiResponse.ERROR
    ) {
      return null;
    }
  } catch (error: any) {
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

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
