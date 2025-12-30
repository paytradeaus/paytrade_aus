import { client } from "@/app/api/apolloClientServices";
import { toast } from "@/app/Toaster";
import { ERROR, SUCCESS } from "@/common/constants/messages";
import { gql } from "@apollo/client";

export const InsertAdminGroupDetails = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
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
    if (response?.data?.insertAdminGroupDetails?.status === SUCCESS) {
      toast.success(successMsg || "group added successfully");
      return true;
    }
    if (response?.data?.insertAdminGroupDetails?.status === ERROR) {
      console.error(response?.data?.insertAdminGroupDetails?.message);
      toast.error(response?.data?.insertAdminGroupDetails?.message);
      return false;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};

export const UpdateGroupDetails = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
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

    if (response?.data?.updateGroupDetails?.status === SUCCESS) {
      toast.success(successMsg || "Group updated successfully");
      return true;
    }
    if (response?.data?.updateGroupDetails?.status === ERROR) {
      console.error(response?.data?.updateGroupDetails?.message);
      toast.error(response?.data?.updateGroupDetails?.message);
      return false;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};

export const GetGroupDetailsById = async (
  data: { id: string },
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.query({
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
    if (response?.data?.getGroupDetailsById?.status === SUCCESS) {
      return response?.data?.getGroupDetailsById?.data;
    }
    if (response?.data?.getGroupDetailsById?.status === ERROR) {
      console.error(response?.data?.getGroupDetailsById?.message);
      toast.error(response?.data?.getGroupDetailsById?.message);
      return {};
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return {};
  } finally {
    setLoading && setLoading(false);
  }
};
