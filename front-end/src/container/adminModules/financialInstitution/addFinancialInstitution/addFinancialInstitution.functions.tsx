import { client } from "@/app/api/apolloClientServices";
import { toast } from "@/app/Toaster";
import { ERROR, SUCCESS } from "@/common/constants/messages";
import { gql } from "@apollo/client";

export const AdminAddFinancialInstitutionDetails = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation AdminAddFinancialInstitutionDetails(
          $addFinInsDetailsInput: AdminAddFinInstitutionInput!
        ) {
          adminAddFinancialInstitutionDetails(
            addFinInsDetailsInput: $addFinInsDetailsInput
          ) {
            data {
              acc_number_maxlength
              created_on
              id
              institution_code
              institution_name
              institution_status
              place
              place_id
              region
              longitude
              latitude
              institution_address
              country
            }
            message
            status
          }
        }
      `,
      variables: {
        addFinInsDetailsInput: data,
      },
    });
    if (
      response?.data?.adminAddFinancialInstitutionDetails?.status === SUCCESS
    ) {
      toast.success(successMsg || "Financial institution added successfully");
      return true;
    }
    if (response?.data?.adminAddFinancialInstitutionDetails?.status === ERROR) {
      console.error(
        response?.data?.adminAddFinancialInstitutionDetails?.message
      );
      toast.error(response?.data?.adminAddFinancialInstitutionDetails?.message);
      return false;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};
export const AdminUpdateFinancialInstitutionDetails = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation AdminUpdateFinancialInstitutionDetails(
          $addFinancialInsDetailsInput: AdminUpdateFinInsInput!
        ) {
          adminUpdateFinancialInstitutionDetails(
            addFinancialInsDetailsInput: $addFinancialInsDetailsInput
          ) {
            message
            status
            data {
              created_on
              id
              institution_code
              institution_name
              institution_status
              acc_number_maxlength
            }
          }
        }
      `,
      variables: {
        addFinancialInsDetailsInput: data,
      },
    });
    if (
      response?.data?.adminUpdateFinancialInstitutionDetails?.status === SUCCESS
    ) {
      toast.success(successMsg || "Financial institution updated successfully");
      return true;
    }
    if (
      response?.data?.adminUpdateFinancialInstitutionDetails?.status === ERROR
    ) {
      console.error(
        response?.data?.adminUpdateFinancialInstitutionDetails?.message
      );
      toast.error(
        response?.data?.adminUpdateFinancialInstitutionDetails?.message
      );
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

export const AdminGetFinancialInstitutionById = async (
  data: { id: string },
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query AdminGetFinancialInstitutionById($id: String!) {
          adminGetFinancialInstitutionById(Id: $id) {
            data {
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
            message
            status
          }
        }
      `,
      variables: {
        ...data,
      },
    });

    if (response?.data?.adminGetFinancialInstitutionById?.status === SUCCESS) {
      return response?.data?.adminGetFinancialInstitutionById?.data;
    }
    if (response?.data?.adminGetFinancialInstitutionById?.status === ERROR) {
      console.error(response?.data?.adminGetFinancialInstitutionById?.message);
      toast.error(response?.data?.adminGetFinancialInstitutionById?.message);
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
