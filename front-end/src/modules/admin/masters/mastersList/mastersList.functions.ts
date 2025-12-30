import { apolloClient } from "@/network/apolloClient";
import { gql } from "@apollo/client";
import { ERROR, SOMETHING_WENT_WRONG, SUCCESS } from "@/app/message";
import { IMastersListDetail } from "./mastersList.types";
import { showErrorToast } from "@/components/Toaster";

export const AdminListAllMasterTypeDetails = async (
  data: any,
  setLoading?: Function
): Promise<
  { MasterTypeDetails: IMastersListDetail[]; totalCount: number } | any
> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query AdminListAllMasterTypeDetails(
          $masterType: String
          $keyword: String
          $sortingOrder: String
          $sortingField: String
          $perPage: Int
          $page: Int
          $status: String
        ) {
          adminListAllMasterTypeDetails(
            MasterType: $masterType
            keyword: $keyword
            sortingOrder: $sortingOrder
            sortingField: $sortingField
            perPage: $perPage
            page: $page
            status: $status
          ) {
            data {
              MasterTypeDetails {
                description
                id
                master_type
                status
                value
              }
              totalCount
            }
            message
            status
          }
        }
      `,
      variables: {
        page: data.page,
        perPage: data.perPage,
        keyword: data.search,
        status: data.status,
        masterType: data.masterType,
        sortingOrder: data?.sorting_order || "",
        sortingField: data?.sorting_field || "",
      },
    });
    if (
      response &&
      response?.data?.adminListAllMasterTypeDetails?.status === SUCCESS
    ) {
      return response?.data?.adminListAllMasterTypeDetails?.data;
    }
    if (
      response &&
      response?.data?.adminListAllMasterTypeDetails?.status === ERROR
    ) {
      console.error(
        response && response?.data?.adminListAllMasterTypeDetails?.message
      );
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

export const AdminfetchAllMasterTypeDetails = async (
  setLoading?: Function
): Promise<{ value: string; label: string } | any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query AdminfetchAllMasters {
          adminfetchAllMasters {
            data
            message
            status
          }
        }
      `,
    });
    if (response?.data?.adminfetchAllMasters?.data?.length > 0) {
      let data = response.data.adminfetchAllMasters?.data;
      let modifiedData = data.map((each: any) => {
        return { value: each, label: each };
      });
      return modifiedData;
    } else {
      return [];
    }
  } catch (error: any) {
    showErrorToast(error?.message || SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return [];
  } finally {
    setLoading && setLoading(false);
  }
};
