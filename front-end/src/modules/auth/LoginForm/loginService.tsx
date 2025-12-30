import { gql } from "@apollo/client";
// import { toast } from "@/app/Toaster";
// import { client } from "@apollo/client";
import { ERROR, SOMETHING_WENT_WRONG, SUCCESS } from "../../../app/message";
// import { toast } from "@/app/toaster";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { client } from "@/app/api/adminApi/adminApi";
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
      // showSuccessToast(
      //   response?.data?.loginByEmailId?.message || SOMETHING_WENT_WRONG
      // );
      return response.data.loginByEmailId;
    }
    if (response?.data?.loginByEmailId?.status === ERROR) {
      showErrorToast(
        response?.data?.loginByEmailId?.message || SOMETHING_WENT_WRONG
      );
      return null;
    }
    return new Error("Invalid Credentials");
  } catch (error: any) {
    showErrorToast(error.message || SOMETHING_WENT_WRONG);
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
      return true;
    }

    if (response?.data?.updatePassword?.status === ERROR) {
      showErrorToast(
        response?.data?.updatePassword?.message || SOMETHING_WENT_WRONG
      );
      return null;
    }

    return new Error("Invalid Credentials");
  } catch (error: any) {
    showErrorToast(error.message || SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return error.message;
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

    if (response?.data?.loginByEmailId?.status === SUCCESS) {
      return response.data.loginByEmailId;
    }

    if (response?.data?.loginByEmailId?.status === ERROR) {
      showErrorToast(
        response?.data?.loginByEmailId?.message || SOMETHING_WENT_WRONG
      );
      return null;
    }

    return new Error("Invalid Credentials");
  } catch (error: any) {
    showErrorToast(error.message || SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return error.message;
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
    if (response?.data?.loginByEmailId?.status === SUCCESS) {
      return response.data.loginByEmailId;
    }

    if (response?.data?.loginByEmailId?.status === ERROR) {
      showErrorToast(
        response?.data?.loginByEmailId?.message || SOMETHING_WENT_WRONG
      );
      return null;
    }

    return new Error("Invalid Credentials");
  } catch (error: any) {
    showErrorToast(error.message || SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return error.message;
  }
}

// export async function insertEmailVerificationDetails(
//   createEmailVerificationInput: any // Adjust the type as needed
// ) {
//   try {
//     const response = await client.mutate({
//       mutation: gql`
//         mutation InsertEmailVerificationDetails(
//           $createEmailVerificationInput: CreateEmailVerificationInput!
//         ) {
//           insertEmailVerificationDetails(
//             createEmailVerificationInput: $createEmailVerificationInput
//           ) {
//             message
//             status
//           }
//         }
//       `,
//       variables: {
//         createEmailVerificationInput,
//       },
//     });
//     if (response?.data?.insertEmailVerificationDetails?.status === SUCCESS) {
//       return true;
//     }
//     if (response?.data?.insertEmailVerificationDetails?.status === ERROR) {
//       return false;
//     }
//     // Return the array of company profiles with logos
//     return false;
//   } catch (error: any) {
//     // Handle errors
//     toast.error(error?.message);
//     throw new Error("Error in Api Call");
//   }
// }

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
    if (response?.data?.loginByEmailId?.status === SUCCESS) {
      return response.data.loginByEmailId;
    }

    if (response?.data?.loginByEmailId?.status === ERROR) {
      showErrorToast(
        response?.data?.loginByEmailId?.message || SOMETHING_WENT_WRONG
      );
      return null;
    }

    return new Error("Invalid Credentials");
  } catch (error: any) {
    showErrorToast(error.message || SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return error.message;
  }
};

export const switchModeOfAnUser = async (userId: number, userMode: any) => {
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
        },
      },
    });

    if (response?.data?.loginByEmailId?.status === SUCCESS) {
      return response.data.loginByEmailId;
    }

    if (response?.data?.loginByEmailId?.status === ERROR) {
      showErrorToast(
        response?.data?.loginByEmailId?.message || SOMETHING_WENT_WRONG
      );
      return null;
    }

    return new Error("Invalid Credentials");
  } catch (error: any) {
    showErrorToast(error.message || SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return error.message;
  }
};
