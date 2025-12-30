import { gql } from "@apollo/client";

import { client } from "@/app/api/adminApi/adminApi";
import { ERROR, SUCCESS } from "@/app/message";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";

export const UpdateAdminDetails = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation UpdateAdminDetails($updateAdminInput: UpdateAdminInput!) {
          updateAdminDetails(updateAdminInput: $updateAdminInput) {
            message
            status
            data {
              id
              first_name
              last_name
              email_id
              admin_status
              admin_role
              last_logged_in
              created_on
            }
          }
        }
      `,
      variables: {
        updateAdminInput: data,
      },
      // fetchPolicy: "no-cache",
    });
    if (response?.data?.updateAdminDetails?.status === SUCCESS) {
      showSuccessToast("Personal info updated successfully");
      return true;
    }
    if (response?.data?.updateAdminDetails?.status === ERROR) {
      console.error(response?.data?.updateAdminDetails?.message);
      showErrorToast(response?.data?.updateAdminDetails?.message);
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

export const GetAdminDetailsById = async (
  data: { id: string },
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query GetAdminDetailsById($id: String!) {
          getAdminDetailsById(Id: $id) {
            data {
              admin_role
              admin_status
              created_on
              email_id
              file
              file_path
              file_type
              first_name
              groupIds
              id
              last_logged_in
              last_name
              profile_id
              signature
              signature_type
            }
            message
            status
          }
        }
      `,
      variables: {
        ...data,
      },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.getAdminDetailsById?.status === SUCCESS) {
      return response?.data?.getAdminDetailsById?.data;
    }
    if (response?.data?.getAdminDetailsById?.status === ERROR) {
      console.error(response?.data?.getAdminDetailsById?.message);
      showErrorToast(response?.data?.getAdminDetailsById?.message);
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
