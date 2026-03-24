import { client } from "@/app/api/adminApi/adminApi";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { gql } from "@apollo/client";

export const FetchAllAdminMenus = async () => {
  try {
    const response = await client.query({
      query: gql`
        query AdminFetchAllMenuDetails {
          adminFetchAllMenuDetails {
            status
            message
            data {
              id
              menu_name
              menu_description
              route_path
              menu_order
              menu_icon
              menu_status
              sub_menus {
                name
                route
                icon
              }
            }
          }
        }
      `,
      fetchPolicy: "network-only",
    });

    if (response?.data?.adminFetchAllMenuDetails?.status === "SUCCESS") {
      return response.data.adminFetchAllMenuDetails.data || [];
    }
    return [];
  } catch (error: any) {
    console.error("Error fetching admin menus:", error);
    showErrorToast("Failed to load admin menus");
    return [];
  }
};

export const AddAdminMenu = async (input: any) => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation AdminAddMenu($input: AddAdminMenuInput!) {
          adminAddMenu(input: $input) {
            status
            message
            data {
              id
              menu_name
              menu_description
              route_path
              menu_order
              menu_icon
              menu_status
              sub_menus {
                name
                route
                icon
              }
            }
          }
        }
      `,
      variables: { input },
    });

    if (response?.data?.adminAddMenu?.status === "SUCCESS") {
      showSuccessToast("Menu added successfully");
      return response.data.adminAddMenu.data;
    }
    showErrorToast(response?.data?.adminAddMenu?.message || "Failed to add menu");
    return null;
  } catch (error: any) {
    showErrorToast(error?.message || "Failed to add menu");
    return null;
  }
};

export const UpdateAdminMenu = async (input: any) => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation AdminUpdateMenu($input: UpdateAdminMenuInput!) {
          adminUpdateMenu(input: $input) {
            status
            message
            data {
              id
              menu_name
              menu_description
              route_path
              menu_order
              menu_icon
              menu_status
              sub_menus {
                name
                route
                icon
              }
            }
          }
        }
      `,
      variables: { input },
    });

    if (response?.data?.adminUpdateMenu?.status === "SUCCESS") {
      return response.data.adminUpdateMenu.data;
    }
    showErrorToast(response?.data?.adminUpdateMenu?.message || "Failed to update menu");
    return null;
  } catch (error: any) {
    showErrorToast(error?.message || "Failed to update menu");
    return null;
  }
};

export const DeleteAdminMenu = async (id: string) => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation AdminDeleteMenu($id: String!) {
          adminDeleteMenu(id: $id) {
            status
            message
          }
        }
      `,
      variables: { id },
    });

    if (response?.data?.adminDeleteMenu?.status === "SUCCESS") {
      showSuccessToast("Menu deleted successfully");
      return true;
    }
    showErrorToast("Failed to delete menu");
    return false;
  } catch (error: any) {
    showErrorToast(error?.message || "Failed to delete menu");
    return false;
  }
};

export const BulkUpdateAdminMenus = async (menus: any[]) => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation AdminBulkUpdateMenus($input: BulkUpdateAdminMenuInput!) {
          adminBulkUpdateMenus(input: $input) {
            status
            message
            data {
              id
              menu_name
              menu_description
              route_path
              menu_order
              menu_icon
              menu_status
              sub_menus {
                name
                route
                icon
              }
            }
          }
        }
      `,
      variables: { input: { menus } },
    });

    if (response?.data?.adminBulkUpdateMenus?.status === "SUCCESS") {
      showSuccessToast("All changes saved successfully");
      return response.data.adminBulkUpdateMenus.data || [];
    }
    showErrorToast("Failed to save changes");
    return null;
  } catch (error: any) {
    showErrorToast(error?.message || "Failed to save changes");
    return null;
  }
};
