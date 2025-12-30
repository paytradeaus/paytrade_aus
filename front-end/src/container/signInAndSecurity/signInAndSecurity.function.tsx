//graphql - apollo client setup
import { gql } from "@apollo/client";
import { client } from "@/app/api/adminAPIs/adminAPIs";
//import from external libraries
import { toast } from "@/app/Toaster";
//module level constants and interfaces
import { SOMETHING_WENT_WRONG } from "@/common/constants/messages";

export async function fetchPersonalInfo(inputData: any): Promise<any> {
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
      variables: inputData,
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

export async function CheckUserStatus(): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query CheckUserStatus {
          checkUserStatus {
            message
            status
          }
        }
      `,
    });

    if (response?.data?.checkUserStatus?.status === "SUCCESS") {
      return response?.data?.checkUserStatus;
    }
    if (response?.data?.checkUserStatus?.status === "ERROR") {
      return response?.data?.checkUserStatus;
    }
  } catch (error: any) {
    toast.error(error.message || SOMETHING_WENT_WRONG);
    return {};
  }
}
