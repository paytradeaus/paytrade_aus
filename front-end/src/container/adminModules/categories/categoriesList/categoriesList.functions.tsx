import { gql } from "@apollo/client";
import { toast } from "@/app/Toaster";
import { client } from "@/app/api/apolloClientServices";
import { ICategories } from "./categoriesList.types";
import {
  ERROR,
  SOMETHING_WENT_WRONG,
  SUCCESS,
} from "@/common/constants/messages";

export const AdminListAllMasterTypeDetails = async (
  data: any,
  setLoading?: Function
): Promise<{ MasterTypeDetails: ICategories[]; totalCount: number } | any> => {
  try {
    const response = await client.query({
      query: gql`
        query AdminListAllMasterTypeDetails(
          $masterType: String
          $keyword: String
          $page: Int
          $perPage: Int
          $status: String
        ) {
          adminListAllMasterTypeDetails(
            MasterType: $masterType
            keyword: $keyword
            page: $page
            perPage: $perPage
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
        keyword: data.keyWord,
        status: data.status,
        masterType: data.masterType,
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
    const response = await client.query({
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
    toast.error(error?.message || SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return [];
  } finally {
    setLoading && setLoading(false);
  }
};
