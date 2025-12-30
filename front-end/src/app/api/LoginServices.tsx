import { gql } from "@apollo/client";
import { toast } from "@/app/Toaster";
import { client } from "./apolloClientServices";
import {
  ERROR,
  SOMETHING_WENT_WRONG,
  SUCCESS,
} from "@/common/constants/messages";

export const loginByEmailId = async (
  emailId: string,
  password: string,
  userTimezone: string
) => {
  try {
    const response = await client.query({
      query: gql`
        query LoginByEmailId(
          $emailId: String!
          $password: String!
          $userTimezone: String!
        ) {
          loginByEmailId(
            email_id: $emailId
            password: $password
            user_timezone: $userTimezone
          ) {
            data {
              access_token
              refresh_token
            }
            message
            status
          }
        }
      `,
      variables: {
        emailId,
        password,
        userTimezone,
      },
    });
    if (response?.data?.loginByEmailId?.status === SUCCESS) {
      return response.data.loginByEmailId;
    }
    if (response?.data?.loginByEmailId?.status === ERROR) {
      toast.error(
        response?.data?.loginByEmailId?.message || SOMETHING_WENT_WRONG
      );
      return null;
    }
    return new Error("Invalid Credentials");
  } catch (error: any) {
    toast.error(error.message || SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return error.message;
  }
};

export const updatePassword = async (
  password: string,
  successMsg?: string
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation UpdatePassword($password: String!) {
          updatePassword(password: $password) {
            message
            status
          }
        }
      `,
      variables: {
        password,
      },
    });
    // You can return any relevant data from the response
    if (response?.data?.updatePassword?.status === SUCCESS) {
      toast.success(response.data.updatePassword?.message || successMsg);
      return true;
    }
    if (response?.data?.updatePassword?.status === ERROR) {
      toast.error(
        response.data.updatePassword?.message || SOMETHING_WENT_WRONG
      );
      return false;
    }
    toast.error(SOMETHING_WENT_WRONG);
    return false;
  } catch (error: any) {
    // Handle errors
    console.error("GraphQL Error:", error);
    toast.error(error?.message);
    throw error;
  }
};

//forgot password
export async function triggerForgotPasswordEmail(inputData: Object) {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation SendVerificationCode($emailId: String!) {
          sendVerificationCode(email_id: $emailId) {
            message
            status
          }
        }
      `,
      variables: inputData,
    });

    if (response?.data?.sendVerificationCode?.status === SUCCESS) {
      toast.success(
        "Email is sent to the user with OTP code to reset password"
      );
      return true;
    }
    if (response?.data?.sendVerificationCode?.status === ERROR) {
      toast.error(response?.data?.sendVerificationCode?.message);
      return false;
    }
  } catch (error: any) {
    // Handle errors
    toast.error(error?.message);
  }
}

//Verify the code
export async function verifyForgotPasswordCode(inputData: Object) {
  try {
    const response = await client.mutate({
      mutation: gql`
        query VerifyCode($emailId: String!, $verificationCode: String!) {
          verifyCode(email_id: $emailId, verification_code: $verificationCode) {
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

    // Handle the response as needed
    if (response?.data?.verifyCode?.status === SUCCESS) {
      toast.success("Code verified successfully");
      return response.data;
    }
    if (response?.data?.verifyCode?.status === ERROR) {
      toast.error(response?.data?.verifyCode?.message);
    }
  } catch (error: any) {
    // Handle errors
    toast.error(error?.message);
    throw new Error("Error in Api Call");
  }
}

export async function insertEmailVerificationDetails(
  createEmailVerificationInput: any // Adjust the type as needed
) {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation InsertEmailVerificationDetails(
          $createEmailVerificationInput: CreateEmailVerificationInput!
        ) {
          insertEmailVerificationDetails(
            createEmailVerificationInput: $createEmailVerificationInput
          ) {
            message
            status
          }
        }
      `,
      variables: {
        createEmailVerificationInput,
      },
    });
    if (response?.data?.insertEmailVerificationDetails?.status === SUCCESS) {
      return true;
    }
    if (response?.data?.insertEmailVerificationDetails?.status === ERROR) {
      return false;
    }
    // Return the array of company profiles with logos
    return false;
  } catch (error: any) {
    // Handle errors
    toast.error(error?.message);
    throw new Error("Error in Api Call");
  }
}

export async function insertIncorrectEmailVerificationDetails(
  createEmailVerificationInput: any
) {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation InsertEmailVerificationDetails(
          $createEmailVerificationInput: CreateEmailVerificationInput!
        ) {
          insertEmailVerificationDetails(
            createEmailVerificationInput: $createEmailVerificationInput
          ) {
            message
            status
          }
        }
      `,
      variables: {
        createEmailVerificationInput,
      },
    });

    if (response?.data?.insertEmailVerificationDetails?.status === SUCCESS) {
      return true;
    }
    if (response?.data?.insertEmailVerificationDetails?.status === ERROR) {
      return false;
    }
    // Return the array of company profiles with logos
    return false;
  } catch (error: any) {
    // Handle errors
    // Example: toast.error("Failed to insert email verification details");
    throw new Error("Error in API call: " + error.message);
  }
}

export async function insertCompanyEmailVerificationDetails(
  createEmailVerificationInput: any
) {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation InsertEmailVerificationDetails(
          $createEmailVerificationInput: CreateEmailVerificationInput!
        ) {
          insertEmailVerificationDetails(
            createEmailVerificationInput: $createEmailVerificationInput
          ) {
            message
            status
          }
        }
      `,
      variables: {
        createEmailVerificationInput,
      },
    });

    if (response?.data?.insertEmailVerificationDetails?.status === SUCCESS) {
      return true;
    }
    if (response?.data?.insertEmailVerificationDetails?.status === ERROR) {
      return false;
    }
    // Return the array of company profiles with logos
    return false;
  } catch (error: any) {
    // Handle errors
    // Example: toast.error("Failed to insert email verification details");
    throw new Error("Error in API call: " + error.message);
  }
}

//Fetch  User Profile Image
// export async function fetchUserProfileImage() {
//   try {
//     const response = await client.query({
//       query: gql`
//         query Query($attachmentType: String!, $companyId: Float) {
//           getFile(attachmentType: $attachmentType, companyId: $companyId)
//         }
//       `,
//       variables: {
//         attachmentType: "User_profile",
//         companyId: null,
//       },
//       context: {
//         headers: {
//           authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjExMTIsInVzZXJOYW1lIjoiQXllc2h1IFJhamEiLCJlbWFpbElkIjoiYXllc2h1QGFiY2QuY29tIiwicm9sZSI6IlNUQU5EQVJEIFVTRVIiLCJzdGF0dXMiOiJBY3RpdmUiLCJjb21wYW55U3BlY2lmaWNSb2xlcyI6W3siY29tcGFueUlkIjoxMDU1LCJyb2xlIjoiU1RBTkRBUkQgVVNFUiIsInN0YXR1cyI6IkFjdGl2ZSIsIm1hbmFnZVVzZXIiOiJObyIsIm1hbmFnZUNvbXBhbnkiOiJZZXMiLCJtYW5hZ2VTdWJzY3JpcHRpb24iOiJZZXMiLCJtYW5hZ2VQcm9qZWN0VHJ1c3RQYXltZW50IjoiWWVzIn1dLCJpYXQiOjE3MDcyMTIyMjUsImV4cCI6MTcwNzI5ODYyNX0.0LcKupIvhsKdqEmcRIgBs_ll7C1nZBXqKptlMLwy7yI`,
//         },
//       },
//     });

//     // You can return any relevant data from the response
//     return response.data;
//   } catch (error: any) {
//     // Handle errors
//     toast.error(error?.message);
//     throw new Error("Error in Api Call");
//   }
// }

export interface UserType {
  date_added: string;
  email_id: string;
  id: string;
  status: string;
  user_id: string;
  user_name: string;
  user_type: string;
}

export const getUserListsForCompany = async (
  data: any,
  setLoading?: Function
): Promise<{ total_count: number; user_list: UserType[] } | any> => {
  try {
    const response = await client.query({
      query: gql`
        query GetUserListsForCompany(
          $companyId: Float!
          $pageNumber: Float!
          $pageSize: Float!
          $search: String
        ) {
          getUserListsForCompany(
            companyId: $companyId
            pageNumber: $pageNumber
            pageSize: $pageSize
            search: $search
          ) {
            data {
              total_count
              user_list {
                date_added
                email_id
                id
                manage_company
                manage_project_trust_payment
                manage_subscription
                manage_user
                status
                user_id
                user_name
                user_type
              }
            }
            message
            status
          }
        }
      `,
      variables: {
        companyId: data.companyId,
        pageNumber: data.pageNumber,
        pageSize: data.pageSize,
        search: data.search,
      },
      fetchPolicy: "no-cache",
    });
    return response?.data?.getUserListsForCompany?.data || null;
  } catch (error: any) {
    toast.error(error.message || "something went wrong in API");
    console.error("GraphQL Error:", error);
    return [];
  } finally {
    setLoading && setLoading(false);
  }
};

export const switchModeOfAnUser = async (
  userId: number,
  userMode: any,
  companyID: any
) => {
  try {
    const response = await client.mutate({
      mutation: gql`
        query SwitchModeOfAnUser($payload: SwitchModeOfAnUserInput!) {
          switchModeOfAnUser(payload: $payload) {
            data
            message
            status
          }
        }
      `,
      variables: {
        payload: {
          user_id: userId,
          user_mode: userMode,
          company_id: companyID,
        },
      },
    });

    if (response?.data?.switchModeOfAnUser?.status === SUCCESS) {
      toast.success(response?.data?.switchModeOfAnUser?.message);
      return response.data.switchModeOfAnUser;
    }

    if (response?.data?.switchModeOfAnUser?.status === ERROR) {
      toast.error(
        response?.data?.switchModeOfAnUser?.message || SOMETHING_WENT_WRONG
      );
      return null;
    }

    throw new Error("Failed to switch user mode");
  } catch (error: any) {
    toast.error(error.message || SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return error.message;
  }
};
