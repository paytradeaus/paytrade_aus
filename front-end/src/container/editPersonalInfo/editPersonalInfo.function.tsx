//graphql - apollo client setup
import { gql } from "@apollo/client";
import { client } from "@/app/api/adminAPIs/adminAPIs";
//import from external libraries
import { toast } from "@/app/Toaster";
//module level constants and interfaces
import {
  ERROR,
  SOMETHING_WENT_WRONG,
  SUCCESS,
} from "@/common/constants/messages";

export async function fetchPersonalInfo(): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query GetUserDetailsByEmailId($emailId: String) {
          getUserDetailsByEmailId(email_id: $emailId) {
            data {
              company_name
              country
              date_of_birth
              email_id
              file
              first_name
              id
              is_verified
              last_logged_in
              last_name
              latitude
              longitude
              occupation
              place_id
              position_title
              region
              signature
              user_address
              user_id
              user_phone_no
              user_role
              user_status
              signature_type
            }
            message
            status
          }
        }
      `,

      fetchPolicy: "no-cache",
    });
    if (response?.data?.getUserDetailsByEmailId?.status === "SUCCESS") {
      return response?.data?.getUserDetailsByEmailId?.data;
    }
    if (response?.data?.getUserDetailsByEmailId?.status === "ERROR") {
      return [];
    }
  } catch (error: any) {
    toast.error(error.message || SOMETHING_WENT_WRONG);
    return [];
  }
}

export async function updatePersonalInfo(inputData: Object) {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation UpdateUserDetails($updateSignupInput: UpdateSignupInput!) {
          updateUserDetails(updateSignupInput: $updateSignupInput) {
            data {
              access_token
            }
            message
            status
          }
        }
      `,
      variables: inputData,
    });

    if (response?.data?.updateUserDetails?.status === SUCCESS) {
      toast.success("Personal info updated successfully");
      return true;
    } else {
      toast.error(response?.data?.updateUserDetails?.message);
      return false;
    }
  } catch (error: any) {
    // Handle errors
    toast.error(error?.message || SOMETHING_WENT_WRONG);
  }
}

export const deleteUserImage = async (data: any): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation DeleteFile($attachmentType: String!) {
          deleteFile(attachmentType: $attachmentType) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.deleteFile?.status === SUCCESS) {
      toast.success("Image deleted successfully");
      return true;
    } else {
      toast.error(response?.data?.deleteFile?.message);
      return false;
    }
  } catch (error: any) {
    toast.error(error.message || "something went wrong in API");

    return false;
  }
};
