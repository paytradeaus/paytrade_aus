import { gql } from "@apollo/client";
import { toast } from "@/app/Toaster";
import { client } from "@/app/api/apolloClientServices";
import { ICurrency } from "./currencyList.types";
import {
  ERROR,
  SOMETHING_WENT_WRONG,
  SUCCESS,
} from "@/common/constants/messages";

export const AdminListAllCurrencyMasterDetails = async (
  data: any,
  setLoading?: Function
): Promise<{ currencyMasters: ICurrency[]; totalCount: number } | any> => {
  try {
    const response = await client.query({
      query: gql`
        query AdminListAllCurrencyMasterDetails(
          $keyword: String
          $page: Int
          $perPage: Int
          $status: String
        ) {
          adminListAllCurrencyMasterDetails(
            keyword: $keyword
            page: $page
            perPage: $perPage
            status: $status
          ) {
            data {
              currencyMasters {
                currency_name
                id
                short_code
                status
                symbol
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
      },
    });
    if (
      response &&
      response?.data?.adminListAllCurrencyMasterDetails?.status === SUCCESS
    ) {
      return response?.data?.adminListAllCurrencyMasterDetails?.data;
    }
    if (
      response &&
      response?.data?.adminListAllCurrencyMasterDetails?.status === ERROR
    ) {
      console.error(
        response && response?.data?.adminListAllCurrencyMasterDetails?.message
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

export const ResetAdminPassword = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
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
    if (response?.data?.resetAdminPassword?.status === SUCCESS) {
      toast.success(successMsg || response?.data?.resetAdminPassword?.message);
      return true;
    }
    if (response?.data?.resetAdminPassword?.status === ERROR) {
      toast.error(response?.data?.resetAdminPassword?.message);
      return false;
    }
  } catch (error: any) {
    toast.error(error?.message || "something went wrong in API");
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};
