import { ERROR, SUCCESS } from "@/app/message";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import apolloClient from "@/network/apolloClient";
import { gql } from "@apollo/client";

export const AdminAddCurrencyMaterDetails = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation AdminAddCurrencyMaterDetails(
          $currencyMaster: CreateCurrencyMasterInput!
        ) {
          adminAddCurrencyMaterDetails(currencyMaster: $currencyMaster) {
            data {
              currency_name
              id
              short_code
              status
              symbol
            }
            message
            status
          }
        }
      `,
      variables: {
        currencyMaster: data,
      },
    });
    if (response?.data?.adminAddCurrencyMaterDetails?.status === SUCCESS) {
      showSuccessToast(successMsg || "Currency added successfully");
      return true;
    }
    if (response?.data?.adminAddCurrencyMaterDetails?.status === ERROR) {
      console.error(response?.data?.adminAddCurrencyMaterDetails?.message);
      showErrorToast(response?.data?.adminAddCurrencyMaterDetails?.message);
      return false;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};
export const AdminUpdateCurrencyMastesDetails = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation AdminUpdateCurrencyMastesDetails(
          $currencyMaster: UpdateCurrencyMasterInput!
        ) {
          adminUpdateCurrencyMastesDetails(currencyMaster: $currencyMaster) {
            data {
              id
              currency_name
            }
            message
            status
          }
        }
      `,
      variables: {
        currencyMaster: data,
      },
    });
    if (response?.data?.adminUpdateCurrencyMastesDetails?.status === SUCCESS) {
      showSuccessToast(successMsg || "Currency updated successfully");
      return true;
    }
    if (response?.data?.adminUpdateCurrencyMastesDetails?.status === ERROR) {
      console.error(response?.data?.adminUpdateCurrencyMastesDetails?.message);
      showErrorToast(response?.data?.adminUpdateCurrencyMastesDetails?.message);
      return false;
    }
  } catch (error: any) {
    // toast.error(error?.message || "something went wrong in API");
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};

export const AdminGetCurrencyById = async (
  data: { currencyId: string },
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query AdminGetCurrencyById($currencyId: String!) {
          adminGetCurrencyById(currency_id: $currencyId) {
            data {
              currency_name
              id
              short_code
              status
              symbol
            }
            message
            status
          }
        }
      `,
      variables: {
        ...data,
      },
    });

    if (response?.data?.adminGetCurrencyById?.status === SUCCESS) {
      return response?.data?.adminGetCurrencyById?.data;
    }
    if (response?.data?.adminGetCurrencyById?.status === ERROR) {
      console.error(response?.data?.adminGetCurrencyById?.message);
      showErrorToast(response?.data?.adminGetCurrencyById?.message);
      return {};
    }
  } catch (error: any) {
    // toast.error(error.message || "somehting went wrong in API");
    console.error("GraphQL Error:", error);
    return {};
  } finally {
    setLoading && setLoading(false);
  }
};
