import { gql } from "@apollo/client";
import { toast } from "@/app/Toaster";
import { client } from "@/app/api/apolloClientServices";
import { BankAccount } from "./financialInstitutionList.types";
import {
  ERROR,
  SOMETHING_WENT_WRONG,
  SUCCESS,
} from "@/common/constants/messages";

export const AdminlistAllFinancialInstituion = async (
  data: any,
  setLoading?: Function
): Promise<{ institutions: BankAccount[]; totalCount: number } | any> => {
  try {
    const response = await client.query({
      query: gql`
        query AdminlistAllFinancialInstituion(
          $isAlphabeticalOrder: Boolean
          $keyword: String
          $page: Int
          $perPage: Int
          $status: String
        ) {
          adminlistAllFinancialInstituion(
            isAlphabeticalOrder: $isAlphabeticalOrder
            keyword: $keyword
            page: $page
            perPage: $perPage
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
