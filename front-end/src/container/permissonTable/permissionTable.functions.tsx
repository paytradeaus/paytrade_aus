import { client } from "@/app/api/apolloClientServices";
import { toast } from "@/app/Toaster";
import { ERROR, SUCCESS } from "@/common/constants/messages";
import { gql } from "@apollo/client";

export const AdminfetchListOfAllMenus = async (
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.query({
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
      response?.data?.adminfetchListOfAllMenus?.status === SUCCESS
    ) {
      return response?.data?.adminfetchListOfAllMenus?.data;
    }

    if (
      response &&
      response?.data?.adminfetchListOfAllMenus?.status === ERROR
    ) {
      console.error(
        response && response?.data?.adminfetchListOfAllMenus?.message
      );
      return null;
    }
  } catch (error: any) {
    toast.error(error.message || ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
