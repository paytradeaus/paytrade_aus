import { client } from "@/app/api/apolloClientServices";
import { toast } from "@/app/Toaster";
import { ERROR, SUCCESS } from "@/common/constants/messages";
import { gql } from "@apollo/client";

export const GetSideMenusForAdmin = async (
  setLoading?: Function
): Promise<any> => {
  try {
    setLoading && setLoading(true);
    const response = await client.query({
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
      fetchPolicy: "no-cache",
    });

    if (response?.data?.getSideMenusForAdmin?.status === SUCCESS) {
      return response?.data?.getSideMenusForAdmin?.data;
    }
    if (response?.data?.getSideMenusForAdmin?.status === ERROR) {
      console.error(response?.data?.getSideMenusForAdmin?.message);
      toast.error(response?.data?.getSideMenusForAdmin?.message);
      return {};
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return {};
  } finally {
    setLoading && setLoading(false);
  }
};
