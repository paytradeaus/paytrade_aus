import { client } from "@/app/api/apolloClientServices";
import { toast } from "@/app/Toaster";
import { ERROR, SUCCESS } from "@/common/constants/messages";
import { gql } from "@apollo/client";

export const AdminAddMasterTypeDetails = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation AdminAddMasterTypeDetails(
          $masterTypes: CreateMasterTypeInput!
        ) {
          adminAddMasterTypeDetails(masterTypes: $masterTypes) {
            data {
              description
              id
              master_type
              status
              value
            }
            message
            status
          }
        }
      `,
      variables: {
        masterTypes: data,
      },
    });
    if (response?.data?.adminAddMasterTypeDetails?.status === SUCCESS) {
      toast.success(successMsg || "Master Category added successfully");
      return true;
    }
    if (response?.data?.adminAddMasterTypeDetails?.status === ERROR) {
      console.error(response?.data?.adminAddMasterTypeDetails?.message);
      toast.error(response?.data?.adminAddMasterTypeDetails?.message);
      return false;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};
export const AdminUpdateMasterTypeDetails = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation AdminUpdateMasterTypeDetails(
          $masterTypes: UpdateMasterTypeInput!
        ) {
          adminUpdateMasterTypeDetails(masterTypes: $masterTypes) {
            data {
              description
              id
              master_type
              status
              value
            }
            message
            status
          }
        }
      `,
      variables: {
        masterTypes: data,
      },
    });
    if (response?.data?.adminUpdateMasterTypeDetails?.status === SUCCESS) {
      toast.success(successMsg || "Master Category updated successfully");
      return true;
    }
    if (response?.data?.adminUpdateMasterTypeDetails?.status === ERROR) {
      console.error(response?.data?.adminUpdateMasterTypeDetails?.message);
      toast.error(response?.data?.adminUpdateMasterTypeDetails?.message);
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

export const AdminGetMasterTypeById = async (
  data: { id: string },
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query AdminGetMasterTypeById($categoryId: String!) {
          adminGetMasterTypeById(category_id: $categoryId) {
            data {
              description
              id
              master_type
              status
              value
            }
            message
            status
          }
        }
      `,
      variables: data,
    });

    if (response?.data?.adminGetMasterTypeById?.status === SUCCESS) {
      return response?.data?.adminGetMasterTypeById?.data;
    }
    if (response?.data?.adminGetMasterTypeById?.status === ERROR) {
      console.error(response?.data?.adminGetMasterTypeById?.message);
      toast.error(response?.data?.adminGetMasterTypeById?.message);
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

export const CheckCategoryNameExistence = async (data: any): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query CheckCategoryNameExistence(
          $category: String!
          $masterType: String!
        ) {
          checkCategoryNameExistence(
            category: $category
            master_type: $masterType
          ) {
            data {
              id
            }
            message
            status
          }
        }
      `,
      variables: data,
    });
    if (response?.data?.checkCategoryNameExistence?.data?.id) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    // Handle GraphQL errors
    console.error("GraphQL Error:", error);
    return false;
  }
};
