import { apolloClient } from "@/network/apolloClient";
import { gql } from "@apollo/client";
import { ERROR, SOMETHING_WENT_WRONG, SUCCESS } from "@/app/message";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { BankAccount } from "@/modules/user/AddUpdateBankAccount/AddUpdateBankAccount.function";

export const AdminlistAllFinancialInstituion = async (
  data: any,
  setLoading?: Function
): Promise<{ institutions: BankAccount[]; totalCount: number } | any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query AdminlistAllFinancialInstituion(
          $isAlphabeticalOrder: Boolean
          $keyword: String
          $page: Int
          $perPage: Int
          $sortingField: String
          $sortingOrder: String
          $status: String
        ) {
          adminlistAllFinancialInstituion(
            isAlphabeticalOrder: $isAlphabeticalOrder
            keyword: $keyword
            page: $page
            perPage: $perPage
            sortingField: $sortingField
            sortingOrder: $sortingOrder
            status: $status
          ) {
            data {
              institutions {
                acc_number_maxlength
                country
                created_on
                id
                institution_address
                institution_code
                institution_name
                institution_status
                latitude
                longitude
                place
                place_id
                region
              }
              totalCount
            }
            message
            status
          }
        }
      `,
      variables: data,
    });
    if (
      response &&
      response?.data?.adminlistAllFinancialInstituion?.status === SUCCESS
    ) {
      return response?.data?.adminlistAllFinancialInstituion?.data;
    }
    if (
      response &&
      response?.data?.adminlistAllFinancialInstituion?.status === ERROR
    ) {
      console.error(
        response && response?.data?.adminlistAllFinancialInstituion?.message
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
