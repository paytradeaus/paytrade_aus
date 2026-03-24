import { showErrorToast } from "@/components/Toaster";
import apolloClient from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

export async function GetSideMenusForAdmin(): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetSideMenusForAdmin {
          getSideMenusForAdmin {
            data {
              admin_id
              all_permission
              delete_permission
              export_permission
              group_id
              group_name
              id
              insert_permission
              list_permission
              menu_description
              menu_icon
              menu_id
              menu_name
              menu_order
              menu_status
              menu_type
              parent_id
              print_permission
              route_path
              sub_menus {
                icon
                name
                route
              }
              update_permission
              view_permission
            }
            message
            status
          }
        }
      `,
      fetchPolicy: "cache-first",
    });

    if (response?.data?.getSideMenusForAdmin?.status === ApiResponse.SUCCESS) {
      return response?.data?.getSideMenusForAdmin?.data;
    }
    if (response?.data?.getSideMenusForAdmin?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.getSideMenusForAdmin?.message);
      return {};
    }
  } catch (error: any) {
    return {};
  }
}
