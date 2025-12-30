import { apolloClient } from "@/network/apolloClient";
import { gql } from "@apollo/client";
import { ERROR, SUCCESS } from "@/app/message";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { ICurrency } from "./currencyList.types";

export const AdminListAllCurrencyMasterDetails = async (
  data: any,
  setLoading?: Function
): Promise<{ currencyMasters: ICurrency[]; totalCount: number } | any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query AdminListAllCurrencyMasterDetails(
          $keyword: String
          $page: Int
          $perPage: Int
          $sortingField: String
          $sortingOrder: String
          $status: String
        ) {
          adminListAllCurrencyMasterDetails(
            keyword: $keyword
            page: $page
            perPage: $perPage
            sortingField: $sortingField
            sortingOrder: $sortingOrder
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
        sortingOrder: data?.sortingOrder || "",
        sortingField: data?.sortingField || "",
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
    const response = await apolloClient.mutate({
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
      showSuccessToast(
        successMsg || response?.data?.resetAdminPassword?.message
      );
      return true;
    }
    if (response?.data?.resetAdminPassword?.status === ERROR) {
      showErrorToast(response?.data?.resetAdminPassword?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error?.message || "something went wrong in API");
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};
